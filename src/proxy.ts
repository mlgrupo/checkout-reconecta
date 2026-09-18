import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

/** Rotas que precisam responder mesmo com o Auth0 fora do ar ou ainda não configurado. */
const SEMPRE_ABERTAS = [
  /^\/api\/asaas\/webhook$/,
  /^\/api\/saude$/,
  /^\/api\/imagens\//,
  /^\/api\/auth\//,
  /^\/sair$/,
  /^\/c\//,
];

/**
 * Next.js 16: `proxy.ts` substitui `middleware.ts`.
 * O SDK do Auth0 monta aqui as rotas /auth/* e renova a sessão automaticamente.
 * A proteção de páginas acontece nos layouts e route handlers (exigirUsuario / exigirApi).
 *
 * Uma falha do Auth0 (credenciais ausentes, tenant fora do ar) não pode derrubar o checkout
 * público, o webhook do Asaas nem o healthcheck: nesses casos seguimos sem sessão.
 */
export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (SEMPRE_ABERTAS.some((r) => r.test(caminho))) {
    return NextResponse.next();
  }
  try {
    return await auth0.middleware(request);
  } catch (e) {
    console.error("[proxy] Auth0 indisponível:", (e as Error).message);
    // Rotas /auth/* sem Auth0 não têm como funcionar; as demais seguem sem sessão.
    if (caminho.startsWith("/auth/")) {
      return NextResponse.redirect(new URL("/entrar?erro=auth0-indisponivel", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|robots.txt|sitemap.xml).*)"],
};
