import "server-only";
import { eq } from "drizzle-orm";
import { obterDb } from "@/db";
import { pedidoItens, pedidos, type Metodo, type Pedido, type PedidoItem } from "@/db/schema";
import { asaas, ErroAsaas, type NovaCobranca } from "@/lib/asaas";
import { adicionarDias, dataIso, somenteDigitos } from "@/lib/formato";
import { obterCheckoutPublico } from "@/lib/links";
import { ErroDominio } from "@/lib/produtos";
import { aplicarCobranca, registrarEvento } from "@/lib/pedidos/status";

export const DIAS_VENCIMENTO_BOLETO = 3;

export type DadosCartao = {
  numero: string;
  nome: string;
  validadeMes: string;
  validadeAno: string;
  cvv: string;
  cep: string;
  numeroEndereco: string;
  complemento?: string;
};

export type DadosNovoPedido = {
  codigoLink: string;
  cliente: { nome: string; email: string; cpfCnpj: string; telefone: string };
  metodo: Metodo;
  bumpAceito: boolean;
  parcelas?: number;
  cartao?: DadosCartao;
  utm?: Record<string, string>;
  ip?: string;
  userAgent?: string;
};

export type ResultadoPedido = { pedido: Pedido; itens: PedidoItem[] };

const BILLING: Record<Metodo, NovaCobranca["billingType"]> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
};

/**
 * Cria o pedido e a cobrança correspondente no Asaas.
 *
 * Order bump: produto principal + bump viram UMA única cobrança com o valor total
 * (um Pix, um boleto ou uma transação de cartão). Os itens ficam registrados em
 * pedido_itens para relatório e conciliação. Ver docs/08-checkout-e-order-bump.md.
 */
export async function criarPedido(dados: DadosNovoPedido): Promise<ResultadoPedido> {
  const checkout = await obterCheckoutPublico(dados.codigoLink);
  if (!checkout) throw new ErroDominio("Este link de pagamento não está mais disponível.", 404);
  if (!checkout.metodos.includes(dados.metodo)) {
    throw new ErroDominio("Este meio de pagamento não está disponível para este produto.", 400, { metodo: "Escolha outro meio." });
  }
  const parcelas = dados.metodo === "cartao" ? Math.max(1, Math.min(dados.parcelas ?? 1, checkout.parcelasMax)) : 1;
  if (dados.metodo === "cartao" && !dados.cartao) {
    throw new ErroDominio("Informe os dados do cartão.", 400, { cartao: "Dados do cartão obrigatórios." });
  }

  const bumpAceito = Boolean(dados.bumpAceito && checkout.bump);
  const itens = [
    { produtoId: checkout.produto.id, tipo: "principal" as const, nome: checkout.produto.nome, precoCentavos: checkout.produto.precoCentavos, quantidade: 1 },
    ...(bumpAceito && checkout.bump
      ? [{ produtoId: checkout.bump.id, tipo: "order_bump" as const, nome: checkout.bump.nome, precoCentavos: checkout.bump.precoCentavos, quantidade: 1 }]
      : []),
  ];
  const total = itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);
  if (total < 100) throw new ErroDominio("O valor mínimo de uma cobrança é R$ 1,00.");

  const db = await obterDb();
  const [linkLinha] = await db.query.linksCheckout.findMany({ where: (t, { eq }) => eq(t.codigo, checkout.codigo), limit: 1 });

  // 1. Pedido local (fonte de verdade da venda), antes de falar com o Asaas.
  const [pedido] = await db
    .insert(pedidos)
    .values({
      linkId: linkLinha?.id ?? null,
      produtoId: checkout.produto.id,
      status: "aguardando",
      metodo: dados.metodo,
      valorTotalCentavos: total,
      bumpAceito,
      clienteNome: dados.cliente.nome.trim(),
      clienteEmail: dados.cliente.email.trim().toLowerCase(),
      clienteCpfCnpj: somenteDigitos(dados.cliente.cpfCnpj),
      clienteTelefone: somenteDigitos(dados.cliente.telefone) || null,
      parcelas,
      utm: dados.utm && Object.keys(dados.utm).length ? dados.utm : null,
      ip: dados.ip ?? null,
      userAgent: dados.userAgent?.slice(0, 500) ?? null,
    })
    .returning();
  const itensCriados = await db
    .insert(pedidoItens)
    .values(itens.map((i) => ({ ...i, pedidoId: pedido.id })))
    .returning();
  await registrarEvento(pedido.id, "criado", `Pedido criado via ${dados.metodo}${bumpAceito ? " com order bump" : ""}.`, {
    total,
    itens: itens.map((i) => i.nome),
  });

  // 2. Cliente + cobrança no Asaas.
  try {
    const cliente = await asaas.obterOuCriarCliente({
      name: dados.cliente.nome.trim(),
      cpfCnpj: somenteDigitos(dados.cliente.cpfCnpj),
      email: dados.cliente.email.trim().toLowerCase(),
      mobilePhone: somenteDigitos(dados.cliente.telefone) || undefined,
      externalReference: pedido.id,
      notificationDisabled: true,
    });

    const descricao = itens.map((i) => i.nome).join(" + ").slice(0, 490);
    const hoje = new Date();
    const cobrancaBase: NovaCobranca = {
      customer: cliente.id,
      billingType: BILLING[dados.metodo],
      value: total / 100,
      dueDate: dataIso(dados.metodo === "boleto" ? adicionarDias(hoje, DIAS_VENCIMENTO_BOLETO) : hoje),
      description: `Pedido #${pedido.numero}: ${descricao}`,
      externalReference: pedido.id,
    };

    if (dados.metodo === "cartao" && dados.cartao) {
      cobrancaBase.remoteIp = dados.ip;
      cobrancaBase.creditCard = {
        holderName: dados.cartao.nome.trim(),
        number: somenteDigitos(dados.cartao.numero),
        expiryMonth: dados.cartao.validadeMes,
        expiryYear: dados.cartao.validadeAno,
        ccv: somenteDigitos(dados.cartao.cvv),
      };
      cobrancaBase.creditCardHolderInfo = {
        name: dados.cliente.nome.trim(),
        email: dados.cliente.email.trim().toLowerCase(),
        cpfCnpj: somenteDigitos(dados.cliente.cpfCnpj),
        postalCode: somenteDigitos(dados.cartao.cep),
        addressNumber: dados.cartao.numeroEndereco.trim(),
        addressComplement: dados.cartao.complemento?.trim() || undefined,
        phone: somenteDigitos(dados.cliente.telefone),
        mobilePhone: somenteDigitos(dados.cliente.telefone),
      };
      if (parcelas > 1) {
        cobrancaBase.installmentCount = parcelas;
        cobrancaBase.totalValue = total / 100;
        delete (cobrancaBase as Partial<NovaCobranca>).value;
      }
    }

    const cobranca = await asaas.criarCobranca(cobrancaBase);

    const extras: Partial<typeof pedidos.$inferInsert> = {
      asaasClienteId: cliente.id,
      asaasCobrancaId: cobranca.id,
    };

    if (dados.metodo === "pix") {
      const qr = await asaas.obterQrCodePix(cobranca.id);
      extras.pixPayload = qr.payload;
      extras.pixImagemBase64 = qr.encodedImage;
      extras.pixExpiraEm = new Date(qr.expirationDate);
    } else if (dados.metodo === "boleto") {
      const linha = await asaas.obterLinhaDigitavel(cobranca.id);
      extras.boletoLinhaDigitavel = linha.identificationField;
      extras.boletoVencimento = cobranca.dueDate;
    }

    const [comCobranca] = await db.update(pedidos).set(extras).where(eq(pedidos.id, pedido.id)).returning();
    await registrarEvento(pedido.id, "cobranca_criada", `Cobrança ${cobranca.id} criada no Asaas (${asaas.ambiente}).`, {
      cobrancaId: cobranca.id,
      billingType: cobranca.billingType,
      status: cobranca.status,
    });

    const final = await aplicarCobranca(comCobranca, cobranca, "criação");
    return { pedido: final, itens: itensCriados };
  } catch (e) {
    // Sem este log, uma falha do Asaas vira só um 502 genérico para o pagador.
    if (e instanceof ErroAsaas) {
      console.error(`[pedidos] Asaas recusou o pedido ${pedido.id}: ${e.status} ${e.message}`, e.erros, e.detalhe);
    } else {
      console.error(`[pedidos] falha ao criar cobrança do pedido ${pedido.id}:`, e);
    }
    // Cartão recusado: o pedido fica registrado como recusado e o pagador pode tentar de novo.
    if (e instanceof ErroAsaas && dados.metodo === "cartao" && e.status === 400) {
      await db.update(pedidos).set({ status: "recusado", asaasStatus: "REFUSED", atualizadoEm: new Date() }).where(eq(pedidos.id, pedido.id));
      await registrarEvento(pedido.id, "status:recusado", `Cartão recusado: ${e.mensagemPublica}`, { erros: e.erros });
      throw new ErroDominio(e.mensagemPublica, 402, { cartao: e.mensagemPublica });
    }
    await db.update(pedidos).set({ status: "cancelado", atualizadoEm: new Date() }).where(eq(pedidos.id, pedido.id));
    await registrarEvento(pedido.id, "erro_asaas", `Falha ao criar cobrança: ${(e as Error).message}`);
    if (e instanceof ErroAsaas) throw new ErroDominio(e.mensagemPublica, 502);
    throw e;
  }
}
