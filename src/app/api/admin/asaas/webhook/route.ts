import { NextResponse } from "next/server";
import { asaas } from "@/lib/asaas";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const EVENTOS = [
  "PAYMENT_CREATED",
  "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_ANTICIPATED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_BANK_SLIP_CANCELLED",
];

function urlWebhook() {
  return `${env.APP_BASE_URL.replace(/\/$/, "")}/api/asaas/webhook`;
}

/** GET — situação do webhook no Asaas para a URL desta aplicação. */
export async function GET() {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  try {
    const url = urlWebhook();
    const lista = await asaas.listarWebhooks();
    const existente = lista.find((w) => w.url === url) ?? null;
    return NextResponse.json({ url, ambiente: asaas.ambiente, tokenConfigurado: Boolean(env.ASAAS_WEBHOOK_TOKEN), webhook: existente });
  } catch (e) {
    return respostaErro(e);
  }
}

/** POST — registra o webhook no Asaas apontando para esta aplicação. */
export async function POST() {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  if (!env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ erro: "Defina ASAAS_WEBHOOK_TOKEN no .env antes de registrar o webhook." }, { status: 400 });
  }
  const url = urlWebhook();
  if (url.includes("localhost") && asaas.ambiente !== "simulacao") {
    return NextResponse.json({ erro: "O Asaas não consegue chamar localhost. Use uma URL pública (túnel ou deploy)." }, { status: 400 });
  }
  try {
    const lista = await asaas.listarWebhooks();
    const existente = lista.find((w) => w.url === url);
    if (existente) return NextResponse.json({ webhook: existente, criado: false });
    const webhook = await asaas.criarWebhook({
      name: "Checkout Reconecta",
      url,
      email: auth.usuario.email ?? "",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: env.ASAAS_WEBHOOK_TOKEN,
      sendType: "SEQUENTIALLY",
      events: EVENTOS,
    });
    return NextResponse.json({ webhook, criado: true }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
