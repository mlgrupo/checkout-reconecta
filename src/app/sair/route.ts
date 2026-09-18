import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ADMIN, opcoesCookie } from "@/lib/auth/sessao-local";
import { env, prontidao } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /sair — encerra a sessão, seja ela local ou do Auth0.
 * Mantém um único destino de logout para a interface.
 */
export async function GET(req: Request) {
  const store = await cookies();
  const tinhaSessaoLocal = Boolean(store.get(COOKIE_ADMIN));

  if (!tinhaSessaoLocal && prontidao.auth0) {
    return NextResponse.redirect(new URL("/auth/logout", env.APP_BASE_URL || req.url));
  }

  const resposta = NextResponse.redirect(new URL("/entrar", env.APP_BASE_URL || req.url));
  resposta.cookies.set(COOKIE_ADMIN, "", opcoesCookie(0));
  return resposta;
}
