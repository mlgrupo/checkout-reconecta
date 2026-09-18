import { NextResponse } from "next/server";
import type { AsaasWebhookPayload } from "@/lib/asaas";
import { env } from "@/lib/env";
import { processarWebhook } from "@/lib/pedidos/status";

export const dynamic = "force-dynamic";

/**
 * POST /api/asaas/webhook — recebe eventos do Asaas.
 * Autentica pelo header `asaas-access-token` (= ASAAS_WEBHOOK_TOKEN), grava o evento (idempotente)
 * e responde 200 rápido. Ver docs/06-integracao-asaas.md.
 */
export async function POST(req: Request) {
  const token = req.headers.get("asaas-access-token");
  if (!env.ASAAS_WEBHOOK_TOKEN) {
    console.error("[webhook] ASAAS_WEBHOOK_TOKEN não configurado; evento recusado.");
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 503 });
  }
  if (!token || !tempoConstanteIgual(token, env.ASAAS_WEBHOOK_TOKEN)) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await req.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }
  if (!payload?.id || !payload?.event) {
    return NextResponse.json({ erro: "Evento sem id ou tipo." }, { status: 400 });
  }

  try {
    const resultado = await processarWebhook(payload);
    return NextResponse.json({ ok: true, resultado });
  } catch (e) {
    // 500 faz o Asaas reenviar depois; o evento já ficou registrado com o erro.
    console.error("[webhook] falha ao processar", payload.id, e);
    return NextResponse.json({ erro: "Falha ao processar; reenviar." }, { status: 500 });
  }
}

function tempoConstanteIgual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
