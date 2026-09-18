import "server-only";
import { eq } from "drizzle-orm";
import { obterDb } from "@/db";
import { eventosPedido, eventosWebhook, pedidos, type Pedido, type StatusPedido } from "@/db/schema";
import { asaas, type AsaasCobranca, type AsaasWebhookPayload } from "@/lib/asaas";

export const STATUS_INFO: Record<StatusPedido, { rotulo: string; tom: "azul" | "dourado" | "bordo" | "verde" | "ambar" | "neutro"; final: boolean }> = {
  aguardando: { rotulo: "Aguardando pagamento", tom: "ambar", final: false },
  em_analise: { rotulo: "Em análise", tom: "azul", final: false },
  pago: { rotulo: "Pago", tom: "verde", final: true },
  recusado: { rotulo: "Recusado", tom: "bordo", final: true },
  expirado: { rotulo: "Expirado", tom: "neutro", final: true },
  cancelado: { rotulo: "Cancelado", tom: "neutro", final: true },
  estornado: { rotulo: "Estornado", tom: "bordo", final: true },
};

/** Traduz o status da cobrança no Asaas para o status do pedido. */
export function mapearStatusAsaas(cobranca: Pick<AsaasCobranca, "status" | "deleted">): StatusPedido | null {
  if (cobranca.deleted) return "cancelado";
  switch (cobranca.status) {
    case "PENDING":
      return "aguardando";
    case "AUTHORIZED":
    case "AWAITING_RISK_ANALYSIS":
      return "em_analise";
    case "CONFIRMED":
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
    case "DUNNING_RECEIVED":
      return "pago";
    case "OVERDUE":
      return "expirado";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "AWAITING_CHARGEBACK_REVERSAL":
      return "estornado";
    default:
      return null;
  }
}

/** Alguns eventos são mais específicos que o status da cobrança. */
function statusPeloEvento(evento: string): StatusPedido | null {
  switch (evento) {
    case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
    case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
      return "recusado";
    case "PAYMENT_DELETED":
    case "PAYMENT_BANK_SLIP_CANCELLED":
      return "cancelado";
    case "PAYMENT_RESTORED":
      return "aguardando";
    default:
      return null;
  }
}

/** Evita regressões: um pedido pago não volta a "aguardando" por evento atrasado. */
function transicaoPermitida(de: StatusPedido, para: StatusPedido) {
  if (de === para) return false;
  if (de === "pago") return para === "estornado" || para === "cancelado";
  if (de === "estornado") return false;
  return true;
}

export async function registrarEvento(pedidoId: string, tipo: string, descricao: string, dados?: Record<string, unknown>) {
  const db = await obterDb();
  await db.insert(eventosPedido).values({ pedidoId, tipo, descricao, dados });
}

/** Aplica os dados de uma cobrança ao pedido. Retorna o pedido atualizado. */
export async function aplicarCobranca(pedido: Pedido, cobranca: AsaasCobranca, origem: string, evento?: string): Promise<Pedido> {
  const db = await obterDb();
  const novoStatus = statusPeloEvento(evento ?? "") ?? mapearStatusAsaas(cobranca);
  const mudou = novoStatus !== null && transicaoPermitida(pedido.status, novoStatus);
  const agora = new Date();

  const valores: Partial<typeof pedidos.$inferInsert> = {
    asaasStatus: cobranca.status,
    asaasInvoiceUrl: cobranca.invoiceUrl ?? pedido.asaasInvoiceUrl,
    asaasBoletoUrl: cobranca.bankSlipUrl ?? pedido.asaasBoletoUrl,
    sincronizadoEm: agora,
    atualizadoEm: agora,
  };
  if (cobranca.creditCard) {
    valores.cartaoBandeira = cobranca.creditCard.creditCardBrand;
    valores.cartaoFinal = cobranca.creditCard.creditCardNumber;
  }
  if (mudou) {
    valores.status = novoStatus!;
    if (novoStatus === "pago" && !pedido.pagoEm) valores.pagoEm = agora;
  }

  const [atualizado] = await db.update(pedidos).set(valores).where(eq(pedidos.id, pedido.id)).returning();

  if (mudou) {
    await registrarEvento(pedido.id, `status:${novoStatus}`, `${STATUS_INFO[novoStatus!].rotulo} (${origem}${evento ? `: ${evento}` : ""})`, {
      asaasStatus: cobranca.status,
      evento,
    });
  } else if (evento) {
    await registrarEvento(pedido.id, "asaas:evento", `Evento ${evento} recebido (status ${cobranca.status}).`, { evento });
  }
  return atualizado;
}

/**
 * Consulta o Asaas quando o pedido ainda não está em estado final e a última
 * sincronização tem mais de `intervaloMs`. Cobre ambientes sem webhook (ex.: localhost).
 */
export async function sincronizarPedido(pedido: Pedido, intervaloMs = 10_000): Promise<Pedido> {
  if (STATUS_INFO[pedido.status].final || !pedido.asaasCobrancaId) return pedido;
  const ultima = pedido.sincronizadoEm?.getTime() ?? 0;
  if (Date.now() - ultima < intervaloMs) return pedido;
  try {
    const cobranca = await asaas.obterCobranca(pedido.asaasCobrancaId);
    return await aplicarCobranca(pedido, cobranca, "sincronização");
  } catch (e) {
    console.warn("[pedidos] falha ao sincronizar", pedido.id, (e as Error).message);
    return pedido;
  }
}

/**
 * Processa um webhook do Asaas de forma idempotente (chave = id do evento).
 * Retorna o que aconteceu, para logs e resposta.
 */
export async function processarWebhook(payload: AsaasWebhookPayload): Promise<"duplicado" | "sem_pedido" | "aplicado" | "ignorado"> {
  const db = await obterDb();
  const inserido = await db
    .insert(eventosWebhook)
    .values({
      id: payload.id,
      evento: payload.event,
      cobrancaId: payload.payment?.id ?? null,
      payload: payload as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ id: eventosWebhook.id });
  if (!inserido.length) return "duplicado";

  const marcar = async (erro?: string) => {
    await db.update(eventosWebhook).set({ processadoEm: new Date(), erro: erro ?? null }).where(eq(eventosWebhook.id, payload.id));
  };

  const cobranca = payload.payment;
  if (!cobranca?.id) {
    await marcar("Evento sem cobrança.");
    return "ignorado";
  }

  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.asaasCobrancaId, cobranca.id)).limit(1);
  const alvo =
    pedido ??
    (cobranca.externalReference
      ? (await db.select().from(pedidos).where(eq(pedidos.id, cobranca.externalReference)).limit(1))[0]
      : undefined);
  if (!alvo) {
    await marcar("Nenhum pedido corresponde a esta cobrança.");
    return "sem_pedido";
  }

  try {
    await aplicarCobranca(alvo, cobranca, "webhook", payload.event);
    await marcar();
    return "aplicado";
  } catch (e) {
    await marcar((e as Error).message);
    throw e;
  }
}
