/**
 * Parcelamento no cartão.
 *
 * Duas formas de cobrar, como é praxe no Brasil:
 *  - **sem juros**: o comprador paga o valor do produto dividido, e o custo do
 *    parcelamento sai da margem do vendedor;
 *  - **com juros**: o valor de cada parcela é calculado pela Tabela Price sobre a taxa
 *    mensal informada, e o comprador paga mais do que o preço à vista.
 *
 * Um link pode misturar os dois: até N parcelas sem juros e, acima disso, com juros.
 * Sem dependências, para o checkout e o servidor calcularem exatamente igual.
 */

export type ConfigParcelamento = {
  /** Maior número de parcelas oferecido. */
  parcelasMax: number;
  /** Até quantas parcelas não há juros. Igual a `parcelasMax` significa tudo sem juros. */
  parcelasSemJuros: number;
  /** Taxa mensal em centésimos de por cento: 299 é 2,99% ao mês. */
  jurosMensalBps: number;
};

export const PARCELAMENTO_PADRAO: ConfigParcelamento = { parcelasMax: 1, parcelasSemJuros: 1, jurosMensalBps: 0 };

export type Parcela = {
  numero: number;
  /** Valor de cada parcela, em centavos. */
  parcelaCentavos: number;
  /** Quanto o comprador paga no total, em centavos. */
  totalCentavos: number;
  /** Quanto disso é juros. Zero quando é sem juros. */
  jurosCentavos: number;
  comJuros: boolean;
};

const limpar = (cfg: ConfigParcelamento): ConfigParcelamento => ({
  parcelasMax: Math.min(12, Math.max(1, Math.trunc(cfg.parcelasMax || 1))),
  parcelasSemJuros: Math.max(1, Math.trunc(cfg.parcelasSemJuros || 1)),
  jurosMensalBps: Math.max(0, Math.trunc(cfg.jurosMensalBps || 0)),
});

/**
 * Calcula uma opção de parcelamento.
 *
 * Sem juros, arredondamos a parcela para cima: é o que o comprador vê e o que o Asaas
 * cobra, distribuindo a diferença de centavos entre as parcelas. Com juros, usamos a
 * Tabela Price e o total passa a ser a parcela vezes o número de vezes.
 */
export function calcularParcela(valorCentavos: number, numero: number, config: ConfigParcelamento): Parcela {
  const cfg = limpar(config);
  const n = Math.min(cfg.parcelasMax, Math.max(1, Math.trunc(numero)));
  const semJuros = n <= cfg.parcelasSemJuros || cfg.jurosMensalBps === 0;

  if (semJuros || n === 1) {
    return {
      numero: n,
      parcelaCentavos: Math.ceil(valorCentavos / n),
      totalCentavos: valorCentavos,
      jurosCentavos: 0,
      comJuros: false,
    };
  }

  const i = cfg.jurosMensalBps / 10000;
  const fator = i / (1 - Math.pow(1 + i, -n));
  const parcelaCentavos = Math.round(valorCentavos * fator);
  const totalCentavos = parcelaCentavos * n;

  return {
    numero: n,
    parcelaCentavos,
    totalCentavos,
    jurosCentavos: totalCentavos - valorCentavos,
    comJuros: true,
  };
}

/** Todas as opções que o checkout deve oferecer, da à vista até o máximo do link. */
export function opcoesDeParcelamento(valorCentavos: number, config: ConfigParcelamento): Parcela[] {
  const cfg = limpar(config);
  return Array.from({ length: cfg.parcelasMax }, (_, k) => calcularParcela(valorCentavos, k + 1, cfg));
}

/** Texto da taxa para a interface: 299 vira "2,99% ao mês". */
export function taxaEmTexto(jurosMensalBps: number) {
  return `${(jurosMensalBps / 100).toFixed(2).replace(".", ",")}% ao mês`;
}

/** Converte o que a pessoa digita ("2,99") para centésimos de por cento. */
export function taxaParaBps(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "").replace(",", ".");
  if (!limpo) return 0;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n < 0 || n > 20) return null;
  return Math.round(n * 100);
}
