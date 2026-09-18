import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { criarProduto, listarProdutos } from "@/lib/produtos";
import { schemaProduto } from "@/lib/validacao/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const url = new URL(req.url);
  try {
    const produtos = await listarProdutos({ incluirInativos: url.searchParams.get("todos") === "1" });
    return NextResponse.json({ produtos });
  } catch (e) {
    return respostaErro(e);
  }
}

export async function POST(req: Request) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const corpo = await lerCorpo(req, schemaProduto);
  if (corpo.erro) return corpo.erro;
  try {
    const produto = await criarProduto(corpo.dados);
    return NextResponse.json({ produto }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
