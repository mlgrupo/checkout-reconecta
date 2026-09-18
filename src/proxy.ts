import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Next.js 16: `proxy.ts` substitui `middleware.ts`.
 * O SDK do Auth0 monta aqui as rotas /auth/* e renova a sessão automaticamente.
 * A proteção de páginas acontece nos layouts e route handlers (exigirUsuario / exigirApi).
 */
export async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|robots.txt|sitemap.xml).*)"],
};
