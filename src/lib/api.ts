import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ErroManagement } from "@/lib/auth0-management";
import { ErroAsaas } from "@/lib/asaas/cliente";
import { ErroDominio } from "@/lib/produtos";

/** Converte qualquer exceção em resposta JSON com status adequado, sem vazar detalhes internos. */
export function respostaErro(e: unknown) {
  if (e instanceof ErroDominio) {
    return NextResponse.json({ erro: e.message, campos: e.campos }, { status: e.status });
  }
  if (e instanceof ErroManagement) {
    const status = e.status >= 400 && e.status < 600 ? e.status : 502;
    if (process.env.NODE_ENV !== "production") console.error("[management]", e.message, e.detalhe);
    return NextResponse.json({ erro: e.message }, { status });
  }
  if (e instanceof ErroAsaas) {
    console.error("[asaas]", e.status, e.message, e.erros);
    return NextResponse.json({ erro: e.mensagemPublica }, { status: e.status === 503 ? 503 : 502 });
  }
  console.error("[api]", e);
  return NextResponse.json({ erro: "Erro inesperado. Tente novamente." }, { status: 500 });
}

/** Lê e valida o corpo JSON. Retorna 400 com a lista de problemas quando inválido. */
export async function lerCorpo<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ dados: T; erro?: undefined } | { dados?: undefined; erro: NextResponse }> {
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return { erro: NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 }) };
  }
  return validar(bruto, schema);
}

export function validar<T>(
  bruto: unknown,
  schema: ZodType<T>,
): { dados: T; erro?: undefined } | { dados?: undefined; erro: NextResponse } {
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    const campos: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const chave = issue.path.join(".") || "_";
      if (!campos[chave]) campos[chave] = issue.message;
    }
    return { erro: NextResponse.json({ erro: "Verifique os campos destacados.", campos }, { status: 400 }) };
  }
  return { dados: resultado.data };
}

/** IP do cliente atrás de proxies (Railway, Vercel, Cloudflare). */
export function ipDaRequisicao(req: Request) {
  const h = req.headers;
  const lista = h.get("x-forwarded-for") || h.get("cf-connecting-ip") || h.get("x-real-ip") || "";
  return lista.split(",")[0]?.trim() || undefined;
}
