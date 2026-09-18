/**
 * Constantes de domínio compartilhadas entre servidor e navegador (sem dependências).
 */

export const METODOS = ["pix", "boleto", "cartao"] as const;
export type Metodo = (typeof METODOS)[number];

export const STATUS_PEDIDO = [
  "aguardando", // cobrança criada, aguardando pagamento
  "em_analise", // cartão em análise de risco no Asaas
  "pago", // PAYMENT_CONFIRMED ou PAYMENT_RECEIVED
  "recusado", // cartão recusado
  "expirado", // vencido sem pagamento
  "cancelado", // cobrança removida
  "estornado", // reembolsado ou chargeback
] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const TIPOS_ITEM = ["principal", "order_bump"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export const METODO_INFO: Record<Metodo, { rotulo: string; descricao: string }> = {
  pix: { rotulo: "Pix", descricao: "Aprovação na hora" },
  cartao: { rotulo: "Cartão", descricao: "Crédito, à vista ou parcelado" },
  boleto: { rotulo: "Boleto", descricao: "Compensa em até 3 dias úteis" },
};
