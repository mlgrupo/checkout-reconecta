import { defineConfig } from "drizzle-kit";

/**
 * Configuração do drizzle-kit (geração de migrações).
 * `pnpm db:generate` lê src/db/schema.ts e escreve SQL em ./drizzle.
 * As migrações são aplicadas automaticamente no boot (src/instrumentation.ts).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://localhost:5432/checkout_reconecta",
  },
  strict: true,
  verbose: true,
});
