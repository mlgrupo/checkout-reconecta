import "server-only";
import { and, count, desc, eq, gte, ilike, or, sql, sum } from "drizzle-orm";
import { obterDb } from "@/db";
import { eventosPedido, linksCheckout, pedidoItens, pedidos, type Pedido, type StatusPedido } from "@/db/schema";
import { sincronizarPedido, STATUS_INFO } from "@/lib/pedidos/status";

export async function obterPedido(id: string): Promise<Pedido | null> {
  const db = await obterDb();
  const [p] = await db.select().from(pedidos).where(eq(pedidos.id, id)).limit(1);
  return p ?? null;
}

export async function obterPedidoCompleto(id: string) {
  const db = await obterDb();
  const pedido = await obterPedido(id);
  if (!pedido) return null;
  const [itens, eventos, link] = await Promise.all([
    db.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, id)),
    db.select().from(eventosPedido).where(eq(eventosPedido.pedidoId, id)).orderBy(desc(eventosPedido.criadoEm)),
    pedido.linkId ? db.select({ codigo: linksCheckout.codigo, nome: linksCheckout.nome }).from(linksCheckout).where(eq(linksCheckout.id, pedido.linkId)).limit(1) : Promise.resolve([]),
  ]);
  return { pedido, itens, eventos, link: link[0] ?? null };
}

/** Dados do pedido que a página pública pode ver (sem dados internos além do necessário). */
export type PedidoPublico = {
  id: string;
  numero: number;
  status: StatusPedido;
  statusRotulo: string;
  final: boolean;
  metodo: Pedido["metodo"];
  valorTotalCentavos: number;
  parcelas: number;
  clienteNome: string;
  clienteEmail: string;
  itens: { nome: string; precoCentavos: number; tipo: string }[];
  pix: { payload: string; imagemBase64: string; expiraEm: string | null } | null;
  boleto: { linhaDigitavel: string; url: string | null; vencimento: string | null } | null;
  cartao: { bandeira: string | null; final: string | null } | null;
  invoiceUrl: string | null;
  urlSucesso: string | null;
  pagoEm: string | null;
  criadoEm: string;
};

export async function obterPedidoPublico(id: string, opcoes: { sincronizar?: boolean } = {}): Promise<PedidoPublico | null> {
  const db = await obterDb();
  let pedido = await obterPedido(id);
  if (!pedido) return null;
  if (opcoes.sincronizar) pedido = await sincronizarPedido(pedido);
  const [itens, link] = await Promise.all([
    db.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, id)),
    pedido.linkId ? db.select({ urlSucesso: linksCheckout.urlSucesso }).from(linksCheckout).where(eq(linksCheckout.id, pedido.linkId)).limit(1) : Promise.resolve([]),
  ]);
  return {
    id: pedido.id,
    numero: pedido.numero,
    status: pedido.status,
    statusRotulo: STATUS_INFO[pedido.status].rotulo,
    final: STATUS_INFO[pedido.status].final,
    metodo: pedido.metodo,
    valorTotalCentavos: pedido.valorTotalCentavos,
    parcelas: pedido.parcelas,
    clienteNome: pedido.clienteNome,
    clienteEmail: pedido.clienteEmail,
    itens: itens.map((i) => ({ nome: i.nome, precoCentavos: i.precoCentavos, tipo: i.tipo })),
    pix:
      pedido.metodo === "pix" && pedido.pixPayload && pedido.pixImagemBase64
        ? { payload: pedido.pixPayload, imagemBase64: pedido.pixImagemBase64, expiraEm: pedido.pixExpiraEm?.toISOString() ?? null }
        : null,
    boleto:
      pedido.metodo === "boleto" && pedido.boletoLinhaDigitavel
        ? { linhaDigitavel: pedido.boletoLinhaDigitavel, url: pedido.asaasBoletoUrl, vencimento: pedido.boletoVencimento }
        : null,
    cartao: pedido.metodo === "cartao" ? { bandeira: pedido.cartaoBandeira, final: pedido.cartaoFinal } : null,
    invoiceUrl: pedido.asaasInvoiceUrl,
    urlSucesso: link[0]?.urlSucesso ?? null,
    pagoEm: pedido.pagoEm?.toISOString() ?? null,
    criadoEm: pedido.criadoEm.toISOString(),
  };
}

export type FiltroPedidos = { status?: StatusPedido; q?: string; pagina?: number; porPagina?: number };

export async function listarPedidos(filtro: FiltroPedidos = {}) {
  const db = await obterDb();
  const pagina = Math.max(0, filtro.pagina ?? 0);
  const porPagina = Math.min(100, Math.max(1, filtro.porPagina ?? 25));
  const termo = filtro.q?.trim();
  const condicoes = [
    filtro.status ? eq(pedidos.status, filtro.status) : undefined,
    termo
      ? or(
          ilike(pedidos.clienteNome, `%${termo}%`),
          ilike(pedidos.clienteEmail, `%${termo}%`),
          ilike(pedidos.clienteCpfCnpj, `%${termo.replace(/\D/g, "") || termo}%`),
          ilike(pedidos.asaasCobrancaId, `%${termo}%`),
          /^\d+$/.test(termo) ? eq(pedidos.numero, Number(termo)) : undefined,
        )
      : undefined,
  ].filter(Boolean);
  const where = condicoes.length ? and(...condicoes) : undefined;

  const [linhas, [{ total }]] = await Promise.all([
    db
      .select({
        pedido: pedidos,
        linkNome: linksCheckout.nome,
        linkCodigo: linksCheckout.codigo,
      })
      .from(pedidos)
      .leftJoin(linksCheckout, eq(pedidos.linkId, linksCheckout.id))
      .where(where)
      .orderBy(desc(pedidos.criadoEm))
      .limit(porPagina)
      .offset(pagina * porPagina),
    db.select({ total: count() }).from(pedidos).where(where),
  ]);

  return {
    pedidos: linhas.map((l) => ({ ...l.pedido, linkNome: l.linkNome, linkCodigo: l.linkCodigo })),
    total,
    pagina,
    porPagina,
  };
}

/** Números para o painel: hoje, últimos 30 dias, taxa de conversão de pedidos em pagos. */
export async function resumoPainel() {
  const db = await obterDb();
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicio30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const agregado = async (desde: Date) => {
    const [linha] = await db
      .select({
        pedidos: count(),
        pagos: sql<number>`count(*) filter (where ${pedidos.status} = 'pago')`.mapWith(Number),
        receita: sql<number>`coalesce(sum(${pedidos.valorTotalCentavos}) filter (where ${pedidos.status} = 'pago'), 0)`.mapWith(Number),
        bumps: sql<number>`count(*) filter (where ${pedidos.status} = 'pago' and ${pedidos.bumpAceito})`.mapWith(Number),
      })
      .from(pedidos)
      .where(gte(pedidos.criadoEm, desde));
    return linha;
  };

  const [hoje, ultimos30, [{ aguardando }], [{ receitaTotal }]] = await Promise.all([
    agregado(inicioHoje),
    agregado(inicio30),
    db.select({ aguardando: count() }).from(pedidos).where(eq(pedidos.status, "aguardando")),
    db.select({ receitaTotal: sum(pedidos.valorTotalCentavos).mapWith(Number) }).from(pedidos).where(eq(pedidos.status, "pago")),
  ]);

  return { hoje, ultimos30, aguardando, receitaTotal: receitaTotal ?? 0 };
}

export async function ultimosPedidos(limite = 8) {
  const db = await obterDb();
  return db.select().from(pedidos).orderBy(desc(pedidos.criadoEm)).limit(limite);
}
