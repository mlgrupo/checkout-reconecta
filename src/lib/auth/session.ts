import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { papeisDoUsuario, type Papel } from "@/lib/auth/roles";
import { usuarioLocal } from "@/lib/auth/sessao-local";

/** Hierarquia: admin engloba operador, que engloba leitura. */
const NIVEL: Record<Papel, number> = { leitura: 1, operador: 2, admin: 3 };

export function nivelDoUsuario(user: { roles: Papel[] }) {
  return user.roles.reduce((max, r) => Math.max(max, NIVEL[r] ?? 0), 0);
}

export function podeAtuarComo(user: { roles: Papel[] }, papel: Papel) {
  return nivelDoUsuario(user) >= NIVEL[papel];
}

export type UsuarioSessao = {
  sub: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  roles: Papel[];
};

function normalizar(user: Record<string, unknown>): UsuarioSessao {
  return {
    sub: String(user.sub),
    name: typeof user.name === "string" ? user.name : undefined,
    nickname: typeof user.nickname === "string" ? user.nickname : undefined,
    email: typeof user.email === "string" ? user.email : undefined,
    email_verified: typeof user.email_verified === "boolean" ? user.email_verified : undefined,
    picture: typeof user.picture === "string" ? user.picture : undefined,
    roles: papeisDoUsuario(user as { roles?: unknown }),
  };
}

/**
 * Sessão atual ou null. Uso em Server Components e Route Handlers.
 * Aceita duas origens: a sessão do Auth0 e o administrador local (docs/04).
 */
export async function obterUsuario(): Promise<UsuarioSessao | null> {
  const local = await usuarioLocal();
  if (local) {
    return { sub: local.sub, name: local.nome, email: local.email, email_verified: true, roles: [local.papel] };
  }
  try {
    const session = await auth0.getSession();
    return session ? normalizar(session.user as Record<string, unknown>) : null;
  } catch {
    // Sem configuração do Auth0 ainda: trata como deslogado em vez de quebrar a página.
    return null;
  }
}

/** Exige sessão em páginas: redireciona para /entrar quando ausente. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  return usuario;
}

type ResultadoApi = { usuario: UsuarioSessao; erro?: undefined } | { usuario?: undefined; erro: NextResponse };

/** Exige sessão + papel em Route Handlers: responde 401/403 em vez de redirecionar. */
export async function exigirApi(papel?: Papel): Promise<ResultadoApi> {
  const usuario = await obterUsuario();
  if (!usuario) {
    return { erro: NextResponse.json({ erro: "Não autenticado." }, { status: 401 }) };
  }
  if (papel && !podeAtuarComo(usuario, papel)) {
    return { erro: NextResponse.json({ erro: "Sem permissão para esta ação." }, { status: 403 }) };
  }
  return { usuario };
}
