import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { atualizarLink, excluirLink } from "@/lib/links";
import { schemaLink } from "@/lib/validacao/admin";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const corpo = await lerCorpo(req, schemaLink.partial());
  if (corpo.erro) return corpo.erro;
  try {
    const link = await atualizarLink(id, corpo.dados);
    return NextResponse.json({ link });
  } catch (e) {
    return respostaErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    await excluirLink(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return respostaErro(e);
  }
}
