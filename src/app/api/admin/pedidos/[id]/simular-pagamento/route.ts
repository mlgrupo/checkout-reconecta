import { NextResponse } from "next/server";
import { asaas } from "@/lib/asaas";
import { pagarQrCodeComoPagador } from "@/lib/asaas/cliente";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { prontidao } from "@/lib/env";
import { obterPedido } from "@/lib/pedidos/consultas";
import { processarWebhook, registrarEvento, sincronizarPedido } from "@/lib/pedidos/status";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/pedidos/:id/simular-pagamento — nunca em produção.
 *
 * Sandbox com conta pagadora (ASAAS_SANDBOX_PAYER_API_KEY) e pedido Pix:
 *   paga o QR Code de verdade pela conta pagadora; o Asaas envia PAYMENT_RECEIVED pelo webhook
 *   (ou a sincronização periódica pega o status).
 * Simulação, boleto/cartão no sandbox, ou sem conta pagadora:
 *   confirma a cobrança pelo endpoint de sandbox e processa o evento como um webhook real.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  if (asaas.ambiente === "production") {
    return NextResponse.json({ erro: "Simulação não é permitida em produção." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const pedido = await obterPedido(id);
    if (!pedido?.asaasCobrancaId) return NextResponse.json({ erro: "Pedido sem cobrança no Asaas." }, { status: 404 });

    if (prontidao.asaasPagadorSandbox && pedido.metodo === "pix" && pedido.pixPayload) {
      const pagamento = await pagarQrCodeComoPagador({
        payload: pedido.pixPayload,
        value: pedido.valorTotalCentavos / 100,
        description: `Teste sandbox · pedido #${pedido.numero}`,
      });
      await registrarEvento(pedido.id, "sandbox:pagador", `QR Code pago pela conta pagadora do sandbox (${pagamento.id}, ${pagamento.status}).`, {
        pagamentoId: pagamento.id,
        status: pagamento.status,
      });
      // Se o Asaas já refletiu o recebimento, atualiza agora; senão o webhook/sincronização faz isso.
      const atualizado = await sincronizarPedido(pedido, 0);
      return NextResponse.json({ ok: true, resultado: "pago_pelo_pagador", status: atualizado.status, pagamento });
    }

    const cobranca = await asaas.confirmarPagamentoTeste(pedido.asaasCobrancaId);
    const resultado = await processarWebhook({
      id: `evt_simulado_${pedido.asaasCobrancaId}_${Date.now()}`,
      event: "PAYMENT_RECEIVED",
      dateCreated: new Date().toISOString(),
      payment: cobranca,
    });
    return NextResponse.json({ ok: true, resultado, status: cobranca.status });
  } catch (e) {
    return respostaErro(e);
  }
}
