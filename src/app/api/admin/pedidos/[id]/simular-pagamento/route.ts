import { NextResponse } from "next/server";
import { asaas } from "@/lib/asaas";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { obterPedido } from "@/lib/pedidos/consultas";
import { processarWebhook } from "@/lib/pedidos/status";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/pedidos/:id/simular-pagamento
 * Só em simulação e sandbox: confirma a cobrança no Asaas e processa o evento como um webhook real.
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
