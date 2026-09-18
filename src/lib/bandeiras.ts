/**
 * Bandeiras de cartão aceitas e detecção pelo início do número (BIN).
 * Os arquivos ficam em public/brand/bandeiras/icon-{id}.svg.
 * A ordem importa: Elo e Hipercard usam faixas que também casariam com Visa,
 * Mastercard ou Discover, então precisam ser testadas antes.
 */

export type Bandeira = {
  id: string;
  nome: string;
  padrao: RegExp;
  /** Quantidade de dígitos válidos, para o campo saber quando o número terminou. */
  digitos: number[];
  cvv: number;
};

export const BANDEIRAS: Bandeira[] = [
  {
    id: "elo",
    nome: "Elo",
    padrao:
      /^(4011(78|79)|43(1274|8935)|45(1416|7393|763[12])|50(4175|6699|67[0-7][0-9]|9[0-9]{3})|627780|63(6297|6368)|650(03[12]|03[5-9]|04[0-9]|05[01]|05[5-9]|06[0-9]|07[0-9]|08[0-9]|4[0-9]{2}|5[0-9]{2})|6516(5[2-9]|6[0-9]|7[0-9])|6550([01][0-9]|2[1-9]|3[0-9]|4[0-9]|5[0-8]))/,
    digitos: [16],
    cvv: 3,
  },
  { id: "hipercard", nome: "Hipercard", padrao: /^(606282|3841[04-6]0)/, digitos: [16, 19], cvv: 3 },
  { id: "american-express", nome: "American Express", padrao: /^3[47]/, digitos: [15], cvv: 4 },
  { id: "diners-club", nome: "Diners Club", padrao: /^3(0[0-5]|095|[68])/, digitos: [14, 16], cvv: 3 },
  { id: "jcb", nome: "JCB", padrao: /^(2131|1800|35\d{2})/, digitos: [16], cvv: 3 },
  { id: "discover", nome: "Discover", padrao: /^(6011|64[4-9]|65)/, digitos: [16], cvv: 3 },
  { id: "aura", nome: "Aura", padrao: /^50(?!4175|6699|67|9)/, digitos: [16], cvv: 3 },
  { id: "mastercard", nome: "Mastercard", padrao: /^(5[1-5]|2[2-7])/, digitos: [16], cvv: 3 },
  { id: "visa", nome: "Visa", padrao: /^4/, digitos: [13, 16, 19], cvv: 3 },
];

/** Ordem de exibição dos selos no checkout: as mais usadas no Brasil primeiro. */
export const BANDEIRAS_EXIBIDAS = ["visa", "mastercard", "elo", "american-express", "hipercard", "diners-club"] as const;

export function detectarBandeira(numero: string): Bandeira | null {
  const d = numero.replace(/\D/g, "");
  if (d.length < 4) return null;
  return BANDEIRAS.find((b) => b.padrao.test(d)) ?? null;
}

export function iconeDaBandeira(id: string) {
  return `/brand/bandeiras/icon-${id}.svg`;
}

/** Quantos dígitos o número pode ter, para validar o tamanho antes de enviar. */
export function digitosEsperados(numero: string) {
  return detectarBandeira(numero)?.digitos ?? [13, 14, 15, 16, 17, 18, 19];
}

export function cvvEsperado(numero: string) {
  return detectarBandeira(numero)?.cvv ?? 3;
}
