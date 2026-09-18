import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db";
import { linksCheckout, produtos, type Produto } from "@/db/schema";
import { slugificar } from "@/lib/formato";

export class ErroDominio extends Error {
  constructor(
    message: string,
    public status = 400,
    public campos?: Record<string, string>,
  ) {
    super(message);
    this.name = "ErroDominio";
  }
}

/** URL da imagem do produto: externa, guardada no banco ou nenhuma. */
export function urlImagemProduto(p: Pick<Produto, "imagemUrl" | "imagemId">) {
  if (p.imagemUrl) return p.imagemUrl;
  if (p.imagemId) return `/api/imagens/${p.imagemId}`;
  return null;
}

export async function listarProdutos(opts: { incluirInativos?: boolean } = {}) {
  const db = await obterDb();
  const lista = await db
    .select({
      produto: produtos,
      totalLinks: sql<number>`(select count(*) from ${linksCheckout} where ${linksCheckout.produtoId} = ${produtos.id})`.mapWith(Number),
    })
    .from(produtos)
    .where(opts.incluirInativos ? undefined : eq(produtos.ativo, true))
    .orderBy(desc(produtos.criadoEm));
  return lista.map(({ produto, totalLinks }) => ({ ...produto, totalLinks, imagem: urlImagemProduto(produto) }));
}

export async function obterProduto(id: string) {
  const db = await obterDb();
  const [p] = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return p ?? null;
}

async function slugDisponivel(base: string, ignorarId?: string) {
  const db = await obterDb();
  let candidato = base || "produto";
  for (let i = 2; i < 100; i++) {
    const [existente] = await db.select({ id: produtos.id }).from(produtos).where(eq(produtos.slug, candidato)).limit(1);
    if (!existente || existente.id === ignorarId) return candidato;
    candidato = `${base}-${i}`;
  }
  throw new ErroDominio("Não foi possível gerar um identificador único para o produto.");
}

export type DadosProduto = {
  nome: string;
  descricao?: string | null;
  precoCentavos: number;
  imagemUrl?: string | null;
  imagemId?: string | null;
  ativo?: boolean;
};

export async function criarProduto(dados: DadosProduto) {
  const db = await obterDb();
  const slug = await slugDisponivel(slugificar(dados.nome));
  const [criado] = await db
    .insert(produtos)
    .values({
      nome: dados.nome.trim(),
      slug,
      descricao: dados.descricao?.trim() || null,
      precoCentavos: dados.precoCentavos,
      imagemUrl: dados.imagemUrl?.trim() || null,
      imagemId: dados.imagemId || null,
      ativo: dados.ativo ?? true,
    })
    .returning();
  return criado;
}

export async function atualizarProduto(id: string, dados: Partial<DadosProduto>) {
  const db = await obterDb();
  const atual = await obterProduto(id);
  if (!atual) throw new ErroDominio("Produto não encontrado.", 404);
  const valores: Partial<typeof produtos.$inferInsert> = { atualizadoEm: new Date() };
  if (dados.nome !== undefined) {
    valores.nome = dados.nome.trim();
    if (valores.nome !== atual.nome) valores.slug = await slugDisponivel(slugificar(valores.nome), id);
  }
  if (dados.descricao !== undefined) valores.descricao = dados.descricao?.trim() || null;
  if (dados.precoCentavos !== undefined) valores.precoCentavos = dados.precoCentavos;
  if (dados.imagemUrl !== undefined) valores.imagemUrl = dados.imagemUrl?.trim() || null;
  if (dados.imagemId !== undefined) valores.imagemId = dados.imagemId || null;
  if (dados.ativo !== undefined) valores.ativo = dados.ativo;
  const [atualizado] = await db.update(produtos).set(valores).where(eq(produtos.id, id)).returning();
  return atualizado;
}

/** Exclui só se nenhum link usa o produto; caso contrário orienta a desativar. */
export async function excluirProduto(id: string) {
  const db = await obterDb();
  const [uso] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(linksCheckout)
    .where(sql`${linksCheckout.produtoId} = ${id} or ${linksCheckout.bumpProdutoId} = ${id}`);
  if (uso.total > 0) {
    throw new ErroDominio(
      `Este produto está em ${uso.total} link(s) de checkout. Desative-o em vez de excluir, ou remova os links primeiro.`,
      409,
    );
  }
  await db.delete(produtos).where(eq(produtos.id, id));
}

export async function opcoesDeProdutos() {
  const db = await obterDb();
  return db
    .select({ id: produtos.id, nome: produtos.nome, precoCentavos: produtos.precoCentavos, ativo: produtos.ativo })
    .from(produtos)
    .orderBy(asc(produtos.nome));
}
