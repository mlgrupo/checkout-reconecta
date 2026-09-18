import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { ehPapel } from "@/lib/auth/roles";

const ROLES_CLAIM = process.env.AUTH0_ROLES_CLAIM || "https://reconecta.com.br/roles";

/** Decodifica o payload de um JWT sem verificar (o SDK já validou a assinatura). */
function payloadDoJwt(token?: string): Record<string, unknown> {
  if (!token) return {};
  try {
    const [, payload] = token.split(".");
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Cliente Auth0 (SDK v4). Rotas montadas automaticamente pelo proxy:
 *   /auth/login · /auth/logout · /auth/callback · /auth/profile · /auth/access-token
 *
 * Variáveis lidas do ambiente: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET,
 * AUTH0_SECRET e APP_BASE_URL.
 */
export const auth0 = new Auth0Client({
  signInReturnToPath: "/painel",
  authorizationParameters: {
    scope: "openid profile email",
  },
  /**
   * Normaliza os papéis antes de gravar o cookie de sessão:
   * lê o claim namespaced do ID token e expõe como `user.roles`.
   * Também descarta claims desnecessários para manter o cookie enxuto.
   */
  beforeSessionSaved: async (session, idToken) => {
    const claims = payloadDoJwt(idToken ?? undefined);
    const brutos = (session.user[ROLES_CLAIM] ?? claims[ROLES_CLAIM]) as unknown;
    const roles = Array.isArray(brutos) ? brutos.filter(ehPapel) : [];

    const { sub, name, nickname, email, email_verified, picture, updated_at } = session.user;
    return {
      ...session,
      user: { sub, name, nickname, email, email_verified, picture, updated_at, roles },
    };
  },
});
