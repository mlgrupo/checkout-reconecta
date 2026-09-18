/**
 * Executa uma vez quando o servidor Next.js sobe (runtime Node).
 * Conecta ao banco e aplica migrações pendentes antes da primeira requisição.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { obterDb, modoDb } = await import("@/db");
  if (process.env.NODE_ENV === "production" && modoDb() === "pglite") {
    console.warn(
      "[db] AVISO: rodando em produção sem DATABASE_URL. O PGlite grava em disco local e os dados somem a cada deploy. Configure um PostgreSQL (docs/10).",
    );
  }
  try {
    await obterDb();
    console.log(`[db] conectado (${modoDb()}) e migrações aplicadas.`);
  } catch (e) {
    console.error("[db] falha ao conectar ou migrar:", e);
  }

  const { env, prontidao } = await import("@/lib/env");
  if (env.ASAAS_ENV !== "simulacao" && !prontidao.asaasReal) {
    console.warn(
      `[asaas] ASAAS_ENV=${env.ASAAS_ENV} mas ASAAS_API_KEY está vazia. Se ela veio de um arquivo .env, ` +
        "escape o cifrão inicial com barra invertida (ASAAS_API_KEY=\\$aact_...); sem isso o valor é apagado na leitura.",
    );
  }
}
