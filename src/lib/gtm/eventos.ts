/**
 * Eventos enviados ao Google Tag Manager pelo checkout (dataLayer).
 * Nomes seguem o padrão de e-commerce do GA4 quando existe equivalente; os demais são
 * específicos da plataforma. Lista completa em docs/09-gtm-e-eventos.md.
 *
 * Usável apenas no cliente. No servidor as funções são no-op.
 */

export type ItemGtm = {
  item_id: string;
  item_name: string;
  price: number; // em reais
  quantity: number;
  item_category?: "principal" | "order_bump";
};

export type EventoGtm =
  | "view_item"
  | "begin_checkout"
  | "add_to_cart"
  | "remove_from_cart"
  | "generate_lead"
  | "checkout_dados_completos"
  | "add_payment_info"
  | "pix_gerado"
  | "boleto_gerado"
  | "cartao_enviado"
  | "aguardando_pagamento"
  | "pagamento_recusado"
  | "pagamento_expirado"
  | "purchase";

type Ecommerce = {
  currency: "BRL";
  value: number;
  items: ItemGtm[];
  transaction_id?: string;
  payment_type?: string;
  coupon?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function reais(centavos: number) {
  return Math.round(centavos) / 100;
}

/** Envia um evento ao dataLayer. Limpa `ecommerce` antes, como o GA4 recomenda. */
export function enviarEvento(evento: EventoGtm, ecommerce?: Ecommerce, extras: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (ecommerce) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event: evento,
    ...(ecommerce ? { ecommerce } : {}),
    ...extras,
    plataforma: "checkout-reconecta",
  });
  if (process.env.NODE_ENV !== "production") {
    console.debug("[gtm]", evento, ecommerce ?? "", extras);
  }
}

/** Lê os parâmetros utm_* (e gclid/fbclid) da URL atual. */
export function lerUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const [k, v] of params) {
    if (/^(utm_[a-z]+|gclid|fbclid|ttclid|src|sck)$/i.test(k) && v) utm[k.toLowerCase()] = v.slice(0, 200);
  }
  return utm;
}
