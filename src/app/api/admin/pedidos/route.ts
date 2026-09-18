import { NextResponse } from "next/server";
import { STATUS_PEDIDO, type StatusPedido } from "@/db/schema";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { listarPedidos } from "@/lib/pedidos/consultas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await exigirApi("leitura");
  if (auth.erro) return auth.erro;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  try {
    const resultado = await listarPedidos({
      status: status && (STATUS_PEDIDO as readonly string[]).includes(status) ? (status as StatusPedido) : undefined,
      q: url.searchParams.get("q") ?? undefined,
      pagina: Number(url.searchParams.get("pagina") ?? 0) || 0,
      porPagina: Number(url.searchParams.get("porPagina") ?? 25) || 25,
    });
    return NextResponse.json(resultado);
  } catch (e) {
    return respostaErro(e);
  }
}
