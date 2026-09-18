import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Papel } from "@/lib/auth/roles";
import { env, prontidao } from "@/lib/env";
import { contarAtivos, obterUsuarioLocal, registrarAcesso } from "@/lib/usuarios-locais";

/**
 * Sessão sem Auth0. Atende duas origens:
 *  - o administrador do ambiente (ADMIN_EMAIL e ADMIN_SENHA), que é a porta de entrada;
 *  - os acessos criados no painel, guardados na tabela `usuarios_locais`.
 *
 * O cookie é assinado com HMAC-SHA256 usando AUTH0_SECRET, então não pode ser forjado.
 * Para os acessos do painel o cookie guarda só o identificador: papel e situação são
 * lidos do banco a cada requisição, então desativar alguém tem efeito imediato.
 */

export const COOKIE_ADMIN = "reconecta_admin";
const DURACAO_HORAS = 8;

type Sujeito = { tipo: "ambiente"; email: string } | { tipo: "painel"; id: string };

function comparar(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function assinar(payload: string) {
  return createHmac("sha256", env.AUTH0_SECRET ?? "").update(payload).digest("base64url");
}

const podeAssinar = () => Boolean(env.AUTH0_SECRET && env.AUTH0_SECRET.length >= 32);

export function criarToken(sujeito: Sujeito) {
  const expiraEm = Date.now() + DURACAO_HORAS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ ...sujeito, expiraEm }), "utf8").toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

function lerToken(token: string | undefined): (Sujeito & { expiraEm: number }) | null {
  if (!token || !podeAssinar()) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  if (!comparar(assinatura, assinar(payload))) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Sujeito & { expiraEm?: number };
    if (typeof dados.expiraEm !== "number" || dados.expiraEm < Date.now()) return null;
    return dados as Sujeito & { expiraEm: number };
  } catch {
    return null;
  }
}

/** Confere as credenciais do administrador do ambiente, em tempo constante. */
export function credenciaisDoAmbiente(email: string, senha: string) {
  if (!prontidao.adminLocal) return false;
  const emailOk = comparar(email.trim().toLowerCase(), (env.ADMIN_EMAIL ?? "").trim().toLowerCase());
  const senhaOk = comparar(senha, env.ADMIN_SENHA ?? "");
  return emailOk && senhaOk;
}

export type AcessoLocal = { sub: string; email: string; nome: string; papel: Papel; origem: "ambiente" | "painel" };

/** Sessão local ativa, se houver cookie válido. */
export async function usuarioLocal(): Promise<AcessoLocal | null> {
  if (!podeAssinar()) return null;
  const store = await cookies();
  const dados = lerToken(store.get(COOKIE_ADMIN)?.value);
  if (!dados) return null;

  if (dados.tipo === "ambiente") {
    // Se o e-mail do ambiente mudou, sessões antigas deixam de valer.
    if (!prontidao.adminLocal) return null;
    if (dados.email.toLowerCase() !== (env.ADMIN_EMAIL ?? "").trim().toLowerCase()) return null;
    return { sub: `local|${dados.email}`, email: dados.email, nome: "Administrador", papel: "admin", origem: "ambiente" };
  }

  const usuario = await obterUsuarioLocal(dados.id);
  if (!usuario || !usuario.ativo) return null;
  return { sub: `painel|${usuario.id}`, email: usuario.email, nome: usuario.nome, papel: usuario.papel, origem: "painel" };
}

/** A tela de entrada mostra o formulário quando há alguma forma de acesso local. */
export async function acessoLocalDisponivel() {
  if (!podeAssinar()) return false;
  if (prontidao.adminLocal) return true;
  try {
    return (await contarAtivos()) > 0;
  } catch {
    return false;
  }
}

export { registrarAcesso };

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
