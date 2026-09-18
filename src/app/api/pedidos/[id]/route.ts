import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { obterPedidoPublico } from "@/lib/pedidos/consultas";

export const dynamic = "force-dynamic";

/**
 * GET /api/pedidos/:id — status público do pedido (a página de pagamento consulta a cada poucos segundos).
 * O id é um UUID aleatório: funciona como token de acesso ao próprio pedido.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  try {
    const pedido = await obterPedidoPublico(id, { sincronizar: true });
    if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json({ pedido }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaErro(e);
  }
}
