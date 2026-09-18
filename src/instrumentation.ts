/**
 * Executa uma vez quando o servidor Next.js sobe (runtime Node).
 * Conecta ao banco e aplica migrações pendentes antes da primeira requisição.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { obterDb, modoDb } = await import("@/db");
  try {
    await obterDb();
    console.log(`[db] conectado (${modoDb()}) e migrações aplicadas.`);
  } catch (e) {
    console.error("[db] falha ao conectar ou migrar:", e);
  }
}
