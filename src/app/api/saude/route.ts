import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { modoDb, obterDb } from "@/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** GET /api/saude — verificação de saúde para o Railway (banco acessível, ambiente). */
export async function GET() {
  try {
    const db = await obterDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, banco: modoDb(), asaas: env.ASAAS_ENV });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 503 });
  }
}
