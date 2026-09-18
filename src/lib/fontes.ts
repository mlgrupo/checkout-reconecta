/**
 * Fontes disponíveis no editor de checkout.
 *
 * A lista é curta de propósito: cada fonte escolhida vira uma requisição externa na
 * página de pagamento, que é a mais sensível a atraso da plataforma. A opção padrão
 * usa as fontes que já vêm com a aplicação, sem nenhuma requisição a mais.
 */

export type Fonte = {
  id: string;
  nome: string;
  /** Pilha CSS aplicada no checkout. */
  familia: string;
  /** Família e pesos no Google Fonts. Vazio quando não há requisição externa. */
  google?: string;
  amostra: string;
};

export const FONTES: Fonte[] = [
  {
    id: "sistema",
    nome: "Padrão da plataforma",
    familia: "var(--font-sora), var(--font-plex), ui-sans-serif, system-ui, sans-serif",
    amostra: "Aa",
  },
  { id: "inter", nome: "Inter", familia: "'Inter', ui-sans-serif, system-ui, sans-serif", google: "Inter:wght@400;500;600;700", amostra: "Aa" },
  { id: "poppins", nome: "Poppins", familia: "'Poppins', ui-sans-serif, system-ui, sans-serif", google: "Poppins:ital,wght@0,400;0,600;0,700;1,400;1,600", amostra: "Aa" },
  { id: "montserrat", nome: "Montserrat", familia: "'Montserrat', ui-sans-serif, system-ui, sans-serif", google: "Montserrat:ital,wght@0,400;0,600;0,700;1,400;1,600", amostra: "Aa" },
  { id: "roboto", nome: "Roboto", familia: "'Roboto', ui-sans-serif, system-ui, sans-serif", google: "Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500", amostra: "Aa" },
  { id: "oswald", nome: "Oswald", familia: "'Oswald', ui-sans-serif, system-ui, sans-serif", google: "Oswald:wght@400;500;600;700", amostra: "Aa" },
  {
    id: "playfair",
    nome: "Playfair Display",
    familia: "'Playfair Display', ui-serif, Georgia, serif",
    google: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600",
    amostra: "Aa",
  },
];

export const IDS_FONTES = FONTES.map((f) => f.id);

export function acharFonte(id: string | undefined) {
  return FONTES.find((f) => f.id === id) ?? FONTES[0];
}

/** URL da folha de estilo da fonte, ou null quando não precisa de requisição externa. */
export function urlDaFonte(id: string | undefined) {
  const fonte = acharFonte(id);
  return fonte.google ? `https://fonts.googleapis.com/css2?family=${fonte.google}&display=swap` : null;
}
