import "server-only";
import { z } from "zod";

/**
 * Variáveis de ambiente validadas no servidor.
 * Nunca importe este módulo em componentes de cliente.
 */
const schema = z.object({
  APP_BASE_URL: z.string().default("http://localhost:3000"),

  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_SECRET: z.string().optional(),

  AUTH0_MGMT_CLIENT_ID: z.string().optional(),
  AUTH0_MGMT_CLIENT_SECRET: z.string().optional(),
  AUTH0_CONNECTION: z.string().default("Username-Password-Authentication"),
  AUTH0_ROLES_CLAIM: z.string().default("https://reconecta.com.br/roles"),

  ASAAS_ENV: z.enum(["simulacao", "sandbox", "production"]).default("simulacao"),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),

  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const detalhes = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Variáveis de ambiente inválidas: ${detalhes}`);
}

const preenchido = (v?: string) => typeof v === "string" && v.trim() !== "";

export const env = {
  ...parsed.data,
  AUTH0_CONNECTION: preenchido(parsed.data.AUTH0_CONNECTION)
    ? parsed.data.AUTH0_CONNECTION
    : "Username-Password-Authentication",
  AUTH0_ROLES_CLAIM: preenchido(parsed.data.AUTH0_ROLES_CLAIM)
    ? parsed.data.AUTH0_ROLES_CLAIM
    : "https://reconecta.com.br/roles",
};

/** Estado de prontidão de cada integração (só booleanos, seguro para exibir). */
export const prontidao = {
  auth0:
    preenchido(env.AUTH0_DOMAIN) &&
    preenchido(env.AUTH0_CLIENT_ID) &&
    preenchido(env.AUTH0_CLIENT_SECRET) &&
    preenchido(env.AUTH0_SECRET) &&
    env.AUTH0_DOMAIN !== "seu-tenant.us.auth0.com",
  auth0Management: preenchido(env.AUTH0_MGMT_CLIENT_ID) && preenchido(env.AUTH0_MGMT_CLIENT_SECRET),
  /** Em modo simulação o checkout funciona sem chave (cobranças fictícias). */
  asaas: env.ASAAS_ENV === "simulacao" || preenchido(env.ASAAS_API_KEY),
  asaasReal: env.ASAAS_ENV !== "simulacao" && preenchido(env.ASAAS_API_KEY),
  asaasWebhook: preenchido(env.ASAAS_WEBHOOK_TOKEN),
  bancoExterno: preenchido(env.DATABASE_URL),
};
