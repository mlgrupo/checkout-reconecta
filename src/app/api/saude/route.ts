import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { modoDb, obterDb } from "@/db";
import { env, prontidao } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/saude — verificação de saúde para o Railway.
 * Só booleanos e nomes de ambiente; nenhum segredo é exposto.
 */
export async function GET() {
  try {
    const db = await obterDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      banco: modoDb(),
      asaas: env.ASAAS_ENV,
      asaasChave: prontidao.asaasReal,
      auth0: prontidao.auth0,
      webhook: prontidao.asaasWebhook,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 503 });
  }
}
