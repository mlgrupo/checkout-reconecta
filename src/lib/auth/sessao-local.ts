import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env, prontidao } from "@/lib/env";

/**
 * Sessão de administrador local: alternativa ao Auth0 para operar a plataforma
 * enquanto o tenant não existe. O cookie é assinado com HMAC-SHA256 usando AUTH0_SECRET,
 * então não pode ser forjado sem o segredo do servidor.
 *
 * Só fica disponível quando ADMIN_EMAIL, ADMIN_SENHA e AUTH0_SECRET estão configurados.
 * Ver docs/04-autenticacao-auth0.md.
 */

export const COOKIE_ADMIN = "reconecta_admin";
const DURACAO_HORAS = 8;

function comparar(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function assinar(payload: string) {
  return createHmac("sha256", env.AUTH0_SECRET ?? "").update(payload).digest("base64url");
}

/** Gera o token de sessão: payload assinado, com validade embutida. */
export function criarToken(email: string) {
  const expiraEm = Date.now() + DURACAO_HORAS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expiraEm }), "utf8").toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

/** Valida assinatura, validade e se o e-mail ainda é o configurado. Retorna o e-mail ou null. */
export function verificarToken(token: string | undefined): string | null {
  if (!token || !prontidao.adminLocal) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  if (!comparar(assinatura, assinar(payload))) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; expiraEm?: number };
    if (typeof dados.expiraEm !== "number" || dados.expiraEm < Date.now()) return null;
    if (typeof dados.email !== "string") return null;
    // Se o e-mail configurado mudou, sessões antigas deixam de valer.
    if (dados.email.toLowerCase() !== (env.ADMIN_EMAIL ?? "").trim().toLowerCase()) return null;
    return dados.email;
  } catch {
    return null;
  }
}

/** Confere as credenciais informadas no formulário, em tempo constante. */
export function credenciaisValidas(email: string, senha: string) {
  if (!prontidao.adminLocal) return false;
  const emailOk = comparar(email.trim().toLowerCase(), (env.ADMIN_EMAIL ?? "").trim().toLowerCase());
  const senhaOk = comparar(senha, env.ADMIN_SENHA ?? "");
  return emailOk && senhaOk;
}

export type AdminLocal = { sub: string; email: string; name: string; roles: ["admin"] };

/** Sessão local ativa, se houver cookie válido. */
export async function usuarioLocal(): Promise<AdminLocal | null> {
  if (!prontidao.adminLocal) return null;
  const store = await cookies();
  const email = verificarToken(store.get(COOKIE_ADMIN)?.value);
  if (!email) return null;
  return { sub: `local|${email}`, email, name: "Administrador", roles: ["admin"] };
}

export function opcoesCookie(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.APP_BASE_URL.startsWith("https://"),
    path: "/",
    maxAge: maxAgeSegundos,
  };
}

export const DURACAO_SEGUNDOS = DURACAO_HORAS * 60 * 60;
