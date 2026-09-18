import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, sql } from "drizzle-orm";
import { obterDb } from "@/db";
import { linksCheckout, METODOS, pedidos, produtos, type LinkCheckout, type Metodo } from "@/db/schema";
import { lerAparencia, mesclarAparencia, type Aparencia, type AparenciaParcial } from "@/lib/aparencia";
import { obterAparenciaLoja } from "@/lib/configuracoes";
import { env } from "@/lib/env";
import { codigoCurto } from "@/lib/formato";
import { ErroDominio, urlImagemProduto } from "@/lib/produtos";

export function urlPublicaDoLink(codigo: string) {
  return `${env.APP_BASE_URL.replace(/\/$/, "")}/c/${codigo}`;
}

export type DadosLink = {
  nome: string;
  produtoId: string;
  bumpProdutoId?: string | null;
  bumpPrecoCentavos?: number | null;
  bumpTitulo?: string | null;
  bumpDescricao?: string | null;
  metodos: Metodo[];
  parcelasMax: number;
  urlSucesso?: string | null;
  ativo?: boolean;
  codigo?: string | null;
};

function validarLink(dados: Partial<DadosLink>) {
  const campos: Record<string, string> = {};
  if (dados.metodos && (!dados.metodos.length || dados.metodos.some((m) => !METODOS.includes(m)))) {
    campos.metodos = "Escolha pelo menos um meio de pagamento.";
  }
  if (dados.parcelasMax !== undefined && (dados.parcelasMax < 1 || dados.parcelasMax > 12)) {
    campos.parcelasMax = "Parcelas entre 1 e 12.";
  }
  if (dados.bumpProdutoId && dados.produtoId && dados.bumpProdutoId === dados.produtoId) {
    campos.bumpProdutoId = "O order bump precisa ser um produto diferente do principal.";
  }
  if (dados.codigo !== undefined && dados.codigo !== null && !/^[a-z0-9-]{3,40}$/.test(dados.codigo)) {
    campos.codigo = "Use só letras minúsculas, números e hífen (3 a 40 caracteres).";
  }
  if (Object.keys(campos).length) throw new ErroDominio("Verifique os campos destacados.", 400, campos);
}

async function codigoDisponivel(desejado?: string | null, ignorarId?: string) {
  const db = await obterDb();
  for (let i = 0; i < 20; i++) {
    const candidato = desejado || codigoCurto();
    const [existente] = await db.select({ id: linksCheckout.id }).from(linksCheckout).where(eq(linksCheckout.codigo, candidato)).limit(1);
    if (!existente || existente.id === ignorarId) return candidato;
    if (desejado) throw new ErroDominio("Este código já está em uso.", 409, { codigo: "Já existe um link com este código." });
  }
  throw new ErroDominio("Não foi possível gerar um código único.");
}

export async function listarLinks() {
  const db = await obterDb();
  const bump = alias(produtos, "bump");
  const linhas = await db
    .select({
      link: linksCheckout,
      produto: { id: produtos.id, nome: produtos.nome, precoCentavos: produtos.precoCentavos, ativo: produtos.ativo },
      bump: { id: bump.id, nome: bump.nome, precoCentavos: bump.precoCentavos },
      totalPedidos: sql<number>`(select count(*) from ${pedidos} where ${pedidos.linkId} = ${linksCheckout.id})`.mapWith(Number),
      pedidosPagos: sql<number>`(select count(*) from ${pedidos} where ${pedidos.linkId} = ${linksCheckout.id} and ${pedidos.status} = 'pago')`.mapWith(Number),
    })
    .from(linksCheckout)
    .innerJoin(produtos, eq(linksCheckout.produtoId, produtos.id))
    .leftJoin(bump, eq(linksCheckout.bumpProdutoId, bump.id))
    .orderBy(desc(linksCheckout.criadoEm));
  return linhas.map((l) => ({
    ...l.link,
    produto: l.produto,
    bump: l.bump?.id ? l.bump : null,
    totalPedidos: l.totalPedidos,
    pedidosPagos: l.pedidosPagos,
    url: urlPublicaDoLink(l.link.codigo),
  }));
}

export async function obterLink(id: string): Promise<LinkCheckout | null> {
  const db = await obterDb();
  const [l] = await db.select().from(linksCheckout).where(eq(linksCheckout.id, id)).limit(1);
  return l ?? null;
}

export async function criarLink(dados: DadosLink) {
  validarLink(dados);
  const db = await obterDb();
  const [produto] = await db.select().from(produtos).where(eq(produtos.id, dados.produtoId)).limit(1);
  if (!produto) throw new ErroDominio("Produto principal não encontrado.", 404, { produtoId: "Escolha um produto." });
  const codigo = await codigoDisponivel(dados.codigo);
  const [criado] = await db
    .insert(linksCheckout)
    .values({
      codigo,
      nome: dados.nome.trim(),
      produtoId: dados.produtoId,
      bumpProdutoId: dados.bumpProdutoId || null,
      bumpPrecoCentavos: dados.bumpProdutoId ? (dados.bumpPrecoCentavos ?? null) : null,
      bumpTitulo: dados.bumpProdutoId ? dados.bumpTitulo?.trim() || null : null,
      bumpDescricao: dados.bumpProdutoId ? dados.bumpDescricao?.trim() || null : null,
      metodos: dados.metodos,
      parcelasMax: dados.parcelasMax,
      urlSucesso: dados.urlSucesso?.trim() || null,
      ativo: dados.ativo ?? true,
    })
    .returning();
  return criado;
}

export async function atualizarLink(id: string, dados: Partial<DadosLink>) {
  validarLink(dados);
  const db = await obterDb();
  const atual = await obterLink(id);
  if (!atual) throw new ErroDominio("Link não encontrado.", 404);
  const valores: Partial<typeof linksCheckout.$inferInsert> = { atualizadoEm: new Date() };
  if (dados.nome !== undefined) valores.nome = dados.nome.trim();
  if (dados.produtoId !== undefined) valores.produtoId = dados.produtoId;
  if (dados.bumpProdutoId !== undefined) {
    valores.bumpProdutoId = dados.bumpProdutoId || null;
    if (!dados.bumpProdutoId) {
      valores.bumpPrecoCentavos = null;
      valores.bumpTitulo = null;
      valores.bumpDescricao = null;
    }
  }
  if (dados.bumpPrecoCentavos !== undefined) valores.bumpPrecoCentavos = dados.bumpPrecoCentavos ?? null;
  if (dados.bumpTitulo !== undefined) valores.bumpTitulo = dados.bumpTitulo?.trim() || null;
  if (dados.bumpDescricao !== undefined) valores.bumpDescricao = dados.bumpDescricao?.trim() || null;
  if (dados.metodos !== undefined) valores.metodos = dados.metodos;
  if (dados.parcelasMax !== undefined) valores.parcelasMax = dados.parcelasMax;
  if (dados.urlSucesso !== undefined) valores.urlSucesso = dados.urlSucesso?.trim() || null;
  if (dados.ativo !== undefined) valores.ativo = dados.ativo;
  if (dados.codigo !== undefined && dados.codigo && dados.codigo !== atual.codigo) {
    valores.codigo = await codigoDisponivel(dados.codigo, id);
  }
  const [atualizado] = await db.update(linksCheckout).set(valores).where(eq(linksCheckout.id, id)).returning();
  return atualizado;
}

/** Grava a personalização do link. `null` faz o link voltar a herdar tudo da loja. */
export async function salvarAparenciaDoLink(id: string, parcial: AparenciaParcial | null) {
  const db = await obterDb();
  const atual = await obterLink(id);
  if (!atual) throw new ErroDominio("Link não encontrado.", 404);
  const valor = parcial && Object.keys(parcial).length > 0 ? parcial : null;
  const [atualizado] = await db
    .update(linksCheckout)
    .set({ aparencia: valor, atualizadoEm: new Date() })
    .where(eq(linksCheckout.id, id))
    .returning();
  return atualizado;
}

export async function excluirLink(id: string) {
  const db = await obterDb();
  const [uso] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(pedidos).where(eq(pedidos.linkId, id));
  if (uso.total > 0) {
    throw new ErroDominio(`Este link já tem ${uso.total} pedido(s). Desative-o em vez de excluir para manter o histórico.`, 409);
  }
  await db.delete(linksCheckout).where(eq(linksCheckout.id, id));
}

/** Dados públicos de um checkout: só o que a página de pagamento precisa. */
export type CheckoutPublico = {
  codigo: string;
  metodos: Metodo[];
  parcelasMax: number;
  urlSucesso: string | null;
  aparencia: Aparencia;
  produto: { id: string; nome: string; descricao: string | null; precoCentavos: number; imagem: string | null };
  bump: {
    id: string;
    nome: string;
    descricao: string | null;
    precoOriginalCentavos: number;
    precoCentavos: number;
    titulo: string;
    imagem: string | null;
  } | null;
};

export async function obterCheckoutPublico(codigo: string): Promise<CheckoutPublico | null> {
  const db = await obterDb();
  const bump = alias(produtos, "bump");
  const [linha] = await db
    .select({ link: linksCheckout, produto: produtos, bump })
    .from(linksCheckout)
    .innerJoin(produtos, eq(linksCheckout.produtoId, produtos.id))
    .leftJoin(bump, eq(linksCheckout.bumpProdutoId, bump.id))
    .where(and(eq(linksCheckout.codigo, codigo), eq(linksCheckout.ativo, true), eq(produtos.ativo, true)))
    .limit(1);
  if (!linha) return null;
  const { link, produto } = linha;
  const b = linha.bump && linha.bump.ativo ? linha.bump : null;
  const aparenciaLoja = await obterAparenciaLoja();
  return {
    codigo: link.codigo,
    metodos: link.metodos,
    parcelasMax: link.parcelasMax,
    urlSucesso: link.urlSucesso,
    aparencia: mesclarAparencia(aparenciaLoja, lerAparencia(link.aparencia)),
    produto: {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      precoCentavos: produto.precoCentavos,
      imagem: urlImagemProduto(produto),
    },
    bump: b
      ? {
          id: b.id,
          nome: b.nome,
          descricao: link.bumpDescricao || b.descricao,
          precoOriginalCentavos: b.precoCentavos,
          precoCentavos: link.bumpPrecoCentavos ?? b.precoCentavos,
          titulo: link.bumpTitulo || `Aproveite e leve também: ${b.nome}`,
          imagem: urlImagemProduto(b),
        }
      : null,
  };
}
