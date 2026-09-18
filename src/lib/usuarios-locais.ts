import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { asc, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db";
import { usuariosLocais, type UsuarioLocal } from "@/db/schema";
import type { Papel } from "@/lib/auth/roles";
import { ErroDominio } from "@/lib/produtos";

/**
 * Pessoas com acesso ao painel sem Auth0.
 *
 * A senha passa por scrypt com sal aleatório por usuário. O formato guardado é
 * `scrypt$<sal em hex>$<derivada em hex>`, para dar espaço a trocar o algoritmo depois
 * sem invalidar o que já existe.
 */

const derivar = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;
const TAMANHO = 64;

export async function protegerSenha(senha: string) {
  const sal = randomBytes(16);
  const derivada = await derivar(senha, sal, TAMANHO);
  return `scrypt$${sal.toString("hex")}$${derivada.toString("hex")}`;
}

export async function senhaConfere(senha: string, guardada: string) {
  const [algoritmo, salHex, esperadoHex] = guardada.split("$");
  if (algoritmo !== "scrypt" || !salHex || !esperadoHex) return false;
  const derivada = await derivar(senha, Buffer.from(salHex, "hex"), TAMANHO);
  const esperado = Buffer.from(esperadoHex, "hex");
  return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
}

export function validarSenha(senha: string) {
  if (senha.length < 10) throw new ErroDominio("A senha precisa ter pelo menos 10 caracteres.", 400, { senha: "Mínimo de 10 caracteres." });
  if (/^\d+$/.test(senha)) throw new ErroDominio("Não use uma senha só de números.", 400, { senha: "Misture letras e números." });
}

const normalizarEmail = (email: string) => email.trim().toLowerCase();

export async function listarUsuariosLocais() {
  const db = await obterDb();
  return db
    .select({
      id: usuariosLocais.id,
      nome: usuariosLocais.nome,
      email: usuariosLocais.email,
      papel: usuariosLocais.papel,
      ativo: usuariosLocais.ativo,
      ultimoAcessoEm: usuariosLocais.ultimoAcessoEm,
      criadoEm: usuariosLocais.criadoEm,
    })
    .from(usuariosLocais)
    .orderBy(asc(usuariosLocais.nome));
}

export async function contarAtivos() {
  const db = await obterDb();
  const [linha] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(usuariosLocais)
    .where(eq(usuariosLocais.ativo, true));
  return linha?.total ?? 0;
}

export async function obterUsuarioLocal(id: string): Promise<UsuarioLocal | null> {
  const db = await obterDb();
  const [u] = await db.select().from(usuariosLocais).where(eq(usuariosLocais.id, id)).limit(1);
  return u ?? null;
}

export async function obterPorEmail(email: string): Promise<UsuarioLocal | null> {
  const db = await obterDb();
  const [u] = await db.select().from(usuariosLocais).where(eq(usuariosLocais.email, normalizarEmail(email))).limit(1);
  return u ?? null;
}

export async function criarUsuarioLocal(dados: { nome: string; email: string; senha: string; papel: Papel }) {
  validarSenha(dados.senha);
  const db = await obterDb();
  const email = normalizarEmail(dados.email);
  if (await obterPorEmail(email)) {
    throw new ErroDominio("Já existe um acesso com este e-mail.", 409, { email: "E-mail já cadastrado." });
  }
  const [criado] = await db
    .insert(usuariosLocais)
    .values({ nome: dados.nome.trim(), email, senhaHash: await protegerSenha(dados.senha), papel: dados.papel })
    .returning({ id: usuariosLocais.id, nome: usuariosLocais.nome, email: usuariosLocais.email, papel: usuariosLocais.papel, ativo: usuariosLocais.ativo });
  return criado;
}

export async function atualizarUsuarioLocal(
  id: string,
  dados: { nome?: string; papel?: Papel; ativo?: boolean; senha?: string },
) {
  const db = await obterDb();
  const atual = await obterUsuarioLocal(id);
  if (!atual) throw new ErroDominio("Acesso não encontrado.", 404);

  const valores: Partial<typeof usuariosLocais.$inferInsert> = { atualizadoEm: new Date() };
  if (dados.nome !== undefined) valores.nome = dados.nome.trim();
  if (dados.papel !== undefined) valores.papel = dados.papel;
  if (dados.ativo !== undefined) valores.ativo = dados.ativo;
  if (dados.senha) {
    validarSenha(dados.senha);
    valores.senhaHash = await protegerSenha(dados.senha);
  }

  const [atualizado] = await db
    .update(usuariosLocais)
    .set(valores)
    .where(eq(usuariosLocais.id, id))
    .returning({ id: usuariosLocais.id, nome: usuariosLocais.nome, email: usuariosLocais.email, papel: usuariosLocais.papel, ativo: usuariosLocais.ativo });
  return atualizado;
}

export async function excluirUsuarioLocal(id: string) {
  const db = await obterDb();
  await db.delete(usuariosLocais).where(eq(usuariosLocais.id, id));
}

export async function registrarAcesso(id: string) {
  const db = await obterDb();
  await db.update(usuariosLocais).set({ ultimoAcessoEm: new Date() }).where(eq(usuariosLocais.id, id));
}

/** Confere e-mail e senha. Devolve o usuário quando confere e está ativo. */
export async function autenticar(email: string, senha: string): Promise<UsuarioLocal | null> {
  const usuario = await obterPorEmail(email);
  if (!usuario || !usuario.ativo) return null;
  return (await senhaConfere(senha, usuario.senhaHash)) ? usuario : null;
}
