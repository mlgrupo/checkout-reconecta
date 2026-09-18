import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

/**
 * Conexão com o banco.
 *  - Com DATABASE_URL: PostgreSQL (Railway, Neon, Supabase, local...).
 *  - Sem DATABASE_URL: PGlite (Postgres embarcado) gravando em .data/pglite. Zero infraestrutura
 *    para desenvolver; mesmo SQL, mesmas migrações.
 * As migrações em ./drizzle são aplicadas na primeira conexão.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Cache = { promessa?: Promise<Db>; modo?: "postgres" | "pglite" };
const cache = globalThis as unknown as { __checkoutDb?: Cache };
cache.__checkoutDb ??= {};

const pastaMigracoes = path.join(process.cwd(), "drizzle");

async function conectarPostgres(url: string): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: pastaMigracoes });
  return db as unknown as Db;
}

async function conectarPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const cliente = new PGlite(dataDir);
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: pastaMigracoes });
  return db as unknown as Db;
}

export function obterDb(): Promise<Db> {
  if (!cache.__checkoutDb!.promessa) {
    const url = process.env.DATABASE_URL?.trim();
    cache.__checkoutDb!.modo = url ? "postgres" : "pglite";
    cache.__checkoutDb!.promessa = (url ? conectarPostgres(url) : conectarPglite()).catch((e) => {
      cache.__checkoutDb!.promessa = undefined;
      throw e;
    });
  }
  return cache.__checkoutDb!.promessa;
}

export function modoDb() {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "pglite";
}

export { schema };
