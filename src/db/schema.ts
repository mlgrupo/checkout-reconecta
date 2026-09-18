import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { AparenciaParcial } from "@/lib/aparencia";
import type { Papel } from "@/lib/auth/roles";
import type { Metodo, StatusPedido, TipoItem } from "@/lib/dominio";

export { METODOS, STATUS_PEDIDO, TIPOS_ITEM } from "@/lib/dominio";
export type { Metodo, StatusPedido, TipoItem } from "@/lib/dominio";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).defaultNow().notNull();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull();

/* ─────────────────────────────────────────────────────────────
   Tabelas
   ───────────────────────────────────────────────────────────── */

/** Imagens de produto guardadas no próprio banco (MVP: simples e durável em qualquer host). */
export const imagens = pgTable("imagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  mime: text("mime").notNull(),
  tamanho: integer("tamanho").notNull(),
  dados: bytea("dados").notNull(),
  criadoEm: criadoEm(),
});

export const produtos = pgTable(
  "produtos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    slug: text("slug").notNull().unique(),
    descricao: text("descricao"),
    precoCentavos: integer("preco_centavos").notNull(),
    imagemId: uuid("imagem_id").references(() => imagens.id, { onDelete: "set null" }),
    imagemUrl: text("imagem_url"),
    ativo: boolean("ativo").default(true).notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("produtos_ativo_idx").on(t.ativo)],
);

/** Link público de checkout: /c/{codigo}. Um produto principal e, opcionalmente, um order bump. */
export const linksCheckout = pgTable(
  "links_checkout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codigo: text("codigo").notNull().unique(),
    nome: text("nome").notNull(),
    produtoId: uuid("produto_id")
      .references(() => produtos.id, { onDelete: "restrict" })
      .notNull(),
    bumpProdutoId: uuid("bump_produto_id").references(() => produtos.id, { onDelete: "set null" }),
    bumpPrecoCentavos: integer("bump_preco_centavos"),
    bumpTitulo: text("bump_titulo"),
    bumpDescricao: text("bump_descricao"),
    metodos: jsonb("metodos").$type<Metodo[]>().default(["pix", "boleto", "cartao"]).notNull(),
    parcelasMax: integer("parcelas_max").default(1).notNull(),
    /** Até quantas parcelas sem juros. Igual a parcelasMax significa tudo sem juros. */
    parcelasSemJuros: integer("parcelas_sem_juros").default(12).notNull(),
    /** Taxa mensal em centésimos de por cento: 299 é 2,99% ao mês. */
    jurosMensalBps: integer("juros_mensal_bps").default(0).notNull(),
    urlSucesso: text("url_sucesso"),
    /** Só os campos que diferem do padrão da loja. Ver src/lib/aparencia.ts. */
    aparencia: jsonb("aparencia").$type<AparenciaParcial>(),
    ativo: boolean("ativo").default(true).notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("links_produto_idx").on(t.produtoId)],
);

export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: integer("numero").generatedAlwaysAsIdentity(),
    linkId: uuid("link_id").references(() => linksCheckout.id, { onDelete: "set null" }),
    produtoId: uuid("produto_id").references(() => produtos.id, { onDelete: "set null" }),
    status: text("status").$type<StatusPedido>().default("aguardando").notNull(),
    metodo: text("metodo").$type<Metodo>().notNull(),
    /** Soma dos itens, sem juros. O que entra de fato é este valor mais `jurosCentavos`. */
    valorTotalCentavos: integer("valor_total_centavos").notNull(),
    /** Juros do parcelamento repassados ao comprador. Zero quando não há. */
    jurosCentavos: integer("juros_centavos").default(0).notNull(),
    bumpAceito: boolean("bump_aceito").default(false).notNull(),

    clienteNome: text("cliente_nome").notNull(),
    clienteEmail: text("cliente_email").notNull(),
    clienteCpfCnpj: text("cliente_cpf_cnpj").notNull(),
    clienteTelefone: text("cliente_telefone"),

    asaasClienteId: text("asaas_cliente_id"),
    asaasCobrancaId: text("asaas_cobranca_id").unique(),
    asaasStatus: text("asaas_status"),
    asaasInvoiceUrl: text("asaas_invoice_url"),
    asaasBoletoUrl: text("asaas_boleto_url"),

    pixPayload: text("pix_payload"),
    pixImagemBase64: text("pix_imagem_base64"),
    pixExpiraEm: timestamp("pix_expira_em", { withTimezone: true }),
    boletoLinhaDigitavel: text("boleto_linha_digitavel"),
    boletoVencimento: text("boleto_vencimento"),
    cartaoBandeira: text("cartao_bandeira"),
    cartaoFinal: text("cartao_final"),
    parcelas: integer("parcelas").default(1).notNull(),

    utm: jsonb("utm").$type<Record<string, string>>(),
    ip: text("ip"),
    userAgent: text("user_agent"),

    pagoEm: timestamp("pago_em", { withTimezone: true }),
    sincronizadoEm: timestamp("sincronizado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("pedidos_status_idx").on(t.status),
    index("pedidos_criado_idx").on(t.criadoEm),
    index("pedidos_email_idx").on(t.clienteEmail),
  ],
);

export const pedidoItens = pgTable("pedido_itens", {
  id: uuid("id").primaryKey().defaultRandom(),
  pedidoId: uuid("pedido_id")
    .references(() => pedidos.id, { onDelete: "cascade" })
    .notNull(),
  produtoId: uuid("produto_id").references(() => produtos.id, { onDelete: "set null" }),
  tipo: text("tipo").$type<TipoItem>().notNull(),
  nome: text("nome").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  quantidade: integer("quantidade").default(1).notNull(),
});

/** Linha do tempo do pedido: criação, geração de Pix, webhooks, mudanças de status. */
export const eventosPedido = pgTable(
  "eventos_pedido",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pedidoId: uuid("pedido_id")
      .references(() => pedidos.id, { onDelete: "cascade" })
      .notNull(),
    tipo: text("tipo").notNull(),
    descricao: text("descricao").notNull(),
    dados: jsonb("dados").$type<Record<string, unknown>>(),
    criadoEm: criadoEm(),
  },
  (t) => [index("eventos_pedido_pedido_idx").on(t.pedidoId)],
);

/** Todo webhook recebido do Asaas, com o id do evento como chave (idempotência). */
export const eventosWebhook = pgTable("eventos_webhook", {
  id: text("id").primaryKey(),
  evento: text("evento").notNull(),
  cobrancaId: text("cobranca_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  recebidoEm: timestamp("recebido_em", { withTimezone: true }).defaultNow().notNull(),
  processadoEm: timestamp("processado_em", { withTimezone: true }),
  erro: text("erro"),
});

/**
 * Pessoas com acesso ao painel, quando a plataforma roda sem Auth0.
 * A senha nunca é guardada: só o resultado do scrypt com sal próprio.
 */
export const usuariosLocais = pgTable(
  "usuarios_locais",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    senhaHash: text("senha_hash").notNull(),
    papel: text("papel").$type<Papel>().default("operador").notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    ultimoAcessoEm: timestamp("ultimo_acesso_em", { withTimezone: true }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("usuarios_locais_ativo_idx").on(t.ativo)],
);

export type UsuarioLocal = typeof usuariosLocais.$inferSelect;

/** Configurações editáveis pelo painel (ex.: id do GTM). */
export const configuracoes = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
  atualizadoEm: atualizadoEm(),
});

export const agora = sql`now()`;

/* ─────────────────────────────────────────────────────────────
   Tipos inferidos
   ───────────────────────────────────────────────────────────── */
export type Produto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;
export type LinkCheckout = typeof linksCheckout.$inferSelect;
export type NovoLinkCheckout = typeof linksCheckout.$inferInsert;
export type Pedido = typeof pedidos.$inferSelect;
export type NovoPedido = typeof pedidos.$inferInsert;
export type PedidoItem = typeof pedidoItens.$inferSelect;
export type EventoPedido = typeof eventosPedido.$inferSelect;
