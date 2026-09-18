import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { criarLink, listarLinks } from "@/lib/links";
import { schemaLink } from "@/lib/validacao/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  try {
    return NextResponse.json({ links: await listarLinks() });
  } catch (e) {
    return respostaErro(e);
  }
}

export async function POST(req: Request) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const corpo = await lerCorpo(req, schemaLink);
  if (corpo.erro) return corpo.erro;
  try {
    const link = await criarLink(corpo.dados);
    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
