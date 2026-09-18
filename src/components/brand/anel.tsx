/**
 * Anel dourado: o único momento de movimento orquestrado da plataforma.
 * Desenha-se uma vez ao carregar a tela de entrada; depois, um satélite azul orbita devagar.
 * Respeita prefers-reduced-motion (ver globals.css).
 */
export function AnelParceria({ tamanho = 420 }: { tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden
      style={{ width: "100%", maxWidth: tamanho, height: "auto" }}
    >
      {/* trilhos finos, estáticos */}
      <circle cx="200" cy="200" r="184" stroke="#0b3dff" strokeOpacity="0.12" strokeWidth="1" />
      <circle cx="200" cy="200" r="120" stroke="#0b3dff" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="2 8" />

      {/* anel principal dourado: desenhado no carregamento */}
      <circle
        cx="200"
        cy="200"
        r="152"
        stroke="#c9a227"
        strokeWidth="3"
        strokeLinecap="round"
        className="anel-traco"
        transform="rotate(-90 200 200)"
      />

      {/* arco azul de acento, também desenhado */}
      <path
        d="M200 48 A152 152 0 0 1 352 200"
        stroke="#0b3dff"
        strokeWidth="6"
        strokeLinecap="round"
        className="anel-traco"
        style={{ animationDelay: "0.35s" }}
      />

      {/* satélite orbitando no trilho externo */}
      <g className="anel-orbita">
        <circle cx="200" cy="16" r="5" fill="#0b3dff" />
        <circle cx="200" cy="16" r="10" stroke="#0b3dff" strokeOpacity="0.25" />
      </g>
    </svg>
  );
}
