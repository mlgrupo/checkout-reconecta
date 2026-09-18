import "server-only";
import { eq } from "drizzle-orm";
import { obterDb } from "@/db";
import { configuracoes } from "@/db/schema";
import { env } from "@/lib/env";

export const CHAVES = {
  gtmId: "gtm_id",
  nomeLoja: "nome_loja",
  emailSuporte: "email_suporte",
  whatsappSuporte: "whatsapp_suporte",
} as const;

export type ChaveConfig = (typeof CHAVES)[keyof typeof CHAVES];

export async function obterConfiguracao(chave: ChaveConfig): Promise<string | null> {
  const db = await obterDb();
  const [linha] = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1);
  return linha?.valor ?? null;
}

export async function obterConfiguracoes(): Promise<Record<ChaveConfig, string>> {
  const db = await obterDb();
  const linhas = await db.select().from(configuracoes);
  const mapa = Object.fromEntries(linhas.map((l) => [l.chave, l.valor])) as Partial<Record<ChaveConfig, string>>;
  return {
    gtm_id: mapa.gtm_id ?? env.NEXT_PUBLIC_GTM_ID ?? "",
    nome_loja: mapa.nome_loja ?? "Reconecta",
    email_suporte: mapa.email_suporte ?? "",
    whatsapp_suporte: mapa.whatsapp_suporte ?? "",
  };
}

export async function salvarConfiguracoes(valores: Partial<Record<ChaveConfig, string>>) {
  const db = await obterDb();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === undefined) continue;
    await db
      .insert(configuracoes)
      .values({ chave, valor: valor.trim(), atualizadoEm: new Date() })
      .onConflictDoUpdate({ target: configuracoes.chave, set: { valor: valor.trim(), atualizadoEm: new Date() } });
  }
}

/** Id do GTM efetivo: painel tem prioridade sobre a variável de ambiente. */
export async function obterGtmId(): Promise<string | null> {
  const salvo = await obterConfiguracao(CHAVES.gtmId);
  const id = (salvo || env.NEXT_PUBLIC_GTM_ID || "").trim();
  return /^GTM-[A-Z0-9]{4,12}$/i.test(id) ? id.toUpperCase() : null;
}
