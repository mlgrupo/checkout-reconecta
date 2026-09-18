import { NextResponse } from "next/server";
import { z } from "zod";
import { METODOS } from "@/db/schema";
import { ipDaRequisicao, lerCorpo, respostaErro } from "@/lib/api";
import { somenteDigitos, validadeCartao, validarCpfCnpj, validarEmail, validarNumeroCartao, validarTelefone } from "@/lib/formato";
import { criarPedido } from "@/lib/pedidos/criar";
import { obterPedidoPublico } from "@/lib/pedidos/consultas";

export const dynamic = "force-dynamic";

const schema = z.object({
  cliente: z.object({
    nome: z.string().trim().min(3, "Informe seu nome completo.").max(120),
    email: z.string().trim().refine(validarEmail, "Informe um e-mail válido."),
    cpfCnpj: z.string().refine(validarCpfCnpj, "CPF ou CNPJ inválido."),
    telefone: z.string().refine(validarTelefone, "Informe um celular com DDD."),
  }),
  metodo: z.enum(METODOS, { message: "Escolha como quer pagar." }),
  bumpAceito: z.boolean().default(false),
  parcelas: z.number().int().min(1).max(12).optional(),
  cartao: z
    .object({
      numero: z.string().refine(validarNumeroCartao, "Número de cartão inválido."),
      nome: z.string().trim().min(3, "Nome como está no cartão."),
      validade: z.string().refine((v) => validadeCartao(v) !== null, "Validade inválida ou vencida."),
      cvv: z.string().refine((v) => /^\d{3,4}$/.test(somenteDigitos(v)), "CVV inválido."),
      cep: z.string().refine((v) => somenteDigitos(v).length === 8, "CEP inválido."),
      numeroEndereco: z.string().trim().min(1, "Informe o número.").max(10),
      complemento: z.string().trim().max(60).optional(),
    })
    .optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});

/** POST /api/checkout/:codigo/pedidos — cria o pedido e a cobrança (público). */
export async function POST(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const corpo = await lerCorpo(req, schema);
  if (corpo.erro) return corpo.erro;
  const d = corpo.dados;

  if (d.metodo === "cartao" && !d.cartao) {
    return NextResponse.json({ erro: "Informe os dados do cartão.", campos: { "cartao.numero": "Obrigatório." } }, { status: 400 });
  }

  try {
    const validade = d.cartao ? validadeCartao(d.cartao.validade)! : null;
    const { pedido } = await criarPedido({
      codigoLink: codigo,
      cliente: d.cliente,
      metodo: d.metodo,
      bumpAceito: d.bumpAceito,
      parcelas: d.parcelas,
      cartao:
        d.cartao && validade
          ? {
              numero: d.cartao.numero,
              nome: d.cartao.nome,
              validadeMes: validade.mes,
              validadeAno: validade.ano,
              cvv: d.cartao.cvv,
              cep: d.cartao.cep,
              numeroEndereco: d.cartao.numeroEndereco,
              complemento: d.cartao.complemento,
            }
          : undefined,
      utm: d.utm,
      ip: ipDaRequisicao(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    const publico = await obterPedidoPublico(pedido.id);
    return NextResponse.json({ pedido: publico }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
