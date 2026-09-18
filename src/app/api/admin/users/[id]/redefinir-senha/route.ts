import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { enviarRedefinicaoDeSenha, obterUsuarioAuth0 } from "@/lib/auth0-management";

export const dynamic = "force-dynamic";

/** POST /api/admin/users/:id/redefinir-senha — envia e-mail de redefinição ao usuário. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    const usuario = await obterUsuarioAuth0(id);
    if (!usuario.email) {
      return NextResponse.json({ erro: "Este usuário não possui e-mail cadastrado." }, { status: 400 });
    }
    await enviarRedefinicaoDeSenha(usuario.email);
    return NextResponse.json({ ok: true, email: usuario.email });
  } catch (e) {
    return respostaErro(e);
  }
}
