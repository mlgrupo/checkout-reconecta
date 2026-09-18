import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { atualizarProduto, excluirProduto, obterProduto } from "@/lib/produtos";
import { schemaProduto } from "@/lib/validacao/admin";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const produto = await obterProduto(id);
  if (!produto) return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  return NextResponse.json({ produto });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const corpo = await lerCorpo(req, schemaProduto.partial());
  if (corpo.erro) return corpo.erro;
  try {
    const produto = await atualizarProduto(id, corpo.dados);
    return NextResponse.json({ produto });
  } catch (e) {
    return respostaErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    await excluirProduto(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return respostaErro(e);
  }
}
