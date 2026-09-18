import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { enviarRedefinicaoDeSenha } from "@/lib/auth0-management";

export const dynamic = "force-dynamic";

/** POST /api/conta/redefinir-senha — o próprio usuário pede o e-mail de redefinição. */
export async function POST() {
  const auth = await exigirApi();
  if (auth.erro) return auth.erro;
  if (!auth.usuario.email) {
    return NextResponse.json({ erro: "Sua conta não possui e-mail cadastrado." }, { status: 400 });
  }
  try {
    await enviarRedefinicaoDeSenha(auth.usuario.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respostaErro(e);
  }
}
