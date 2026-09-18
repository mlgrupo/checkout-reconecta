import "server-only";
import { env } from "@/lib/env";
import { asaasReal } from "@/lib/asaas/cliente";
import { asaasSimulado } from "@/lib/asaas/simulado";
import type { PortaAsaas } from "@/lib/asaas/tipos";

/**
 * Ponto único de acesso ao Asaas.
 * ASAAS_ENV=simulacao → cobranças fictícias em memória (sem chave).
 * ASAAS_ENV=sandbox|production → API real.
 */
export const asaas: PortaAsaas = env.ASAAS_ENV === "simulacao" ? asaasSimulado : asaasReal;

export { ErroAsaas } from "@/lib/asaas/cliente";
export type * from "@/lib/asaas/tipos";
