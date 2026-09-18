import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { obterPedidoCompleto } from "@/lib/pedidos/consultas";
import { sincronizarPedido } from "@/lib/pedidos/status";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/pedidos/:id — pedido, itens e linha do tempo. ?sincronizar=1 consulta o Asaas antes. */
export async function GET(req: Request, { params }: Ctx) {
  const auth = await exigirApi("leitura");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const url = new URL(req.url);
  try {
    let completo = await obterPedidoCompleto(id);
    if (!completo) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
    if (url.searchParams.get("sincronizar") === "1") {
      await sincronizarPedido(completo.pedido, 0);
      completo = (await obterPedidoCompleto(id))!;
    }
    return NextResponse.json(completo);
  } catch (e) {
    return respostaErro(e);
  }
}
