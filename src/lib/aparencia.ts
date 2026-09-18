import { z } from "zod";
import { ehHexValido } from "@/lib/cores";
import { IDS_FONTES } from "@/lib/fontes";

/**
 * Aparência do checkout: o que o editor controla.
 * Existe um padrão da loja (tabela `configuracoes`, chave `aparencia`) e um ajuste por link
 * (`links_checkout.aparencia`), que guarda só os campos diferentes do padrão.
 */

export type Depoimento = { nome: string; texto: string; nota: number };

/** Modelos de página. Mudam onde o resumo fica e a largura da coluna. */
export const MODELOS = ["classico", "compacto", "focado", "unico"] as const;
export type Modelo = (typeof MODELOS)[number];

export const MODELO_INFO: Record<Modelo, { rotulo: string; descricao: string }> = {
  classico: { rotulo: "Clássico", descricao: "Duas colunas no computador, resumo fixo à direita." },
  compacto: { rotulo: "Compacto", descricao: "Uma coluna, resumo no topo. Bom para tráfego de celular." },
  focado: { rotulo: "Focado", descricao: "Uma coluna estreita e centralizada, sem distração." },
  unico: {
    rotulo: "Cartão único",
    descricao: "Tudo dentro de um cartão estreito: produto no topo, formas de pagamento que abrem uma de cada vez e o resumo junto do botão.",
  },
};

/** Blocos que podem ser reordenados no editor. O botão de pagar fica sempre no fim. */
export const BLOCOS = ["dados", "pagamento", "bump", "garantia", "depoimentos"] as const;
export type Bloco = (typeof BLOCOS)[number];

export const BLOCO_INFO: Record<Bloco, { rotulo: string; descricao: string }> = {
  dados: { rotulo: "Seus dados", descricao: "Nome, e-mail, celular e documento." },
  pagamento: { rotulo: "Pagamento", descricao: "Escolha do método e campos do cartão." },
  bump: { rotulo: "Order bump", descricao: "Oferta extra, quando o link tiver uma." },
  garantia: { rotulo: "Garantia", descricao: "Selo com o prazo de devolução." },
  depoimentos: { rotulo: "Depoimentos", descricao: "Provas sociais de quem já comprou." },
};

export const ALINHAMENTOS = ["esquerda", "centro", "direita"] as const;
export type Alinhamento = (typeof ALINHAMENTOS)[number];

export const ALINHAMENTO_CLASSE: Record<Alinhamento, string> = {
  esquerda: "text-left",
  centro: "text-center",
  direita: "text-right",
};

/** Tipografia do cabeçalho da oferta e da fonte do checkout inteiro. */
export type Tipografia = {
  fonte: string;
  alinhamento: Alinhamento;
  tituloTamanho: number;
  tituloNegrito: boolean;
  tituloItalico: boolean;
};

export const FUNDOS = ["claro", "escuro"] as const;
export type Fundo = (typeof FUNDOS)[number];

export const ESTILOS_IMAGEM = ["cobrir", "repetir", "topo"] as const;
export type EstiloImagem = (typeof ESTILOS_IMAGEM)[number];

export const ESTILO_IMAGEM_INFO: Record<EstiloImagem, { rotulo: string; descricao: string }> = {
  cobrir: { rotulo: "Cobrir", descricao: "A imagem preenche a tela inteira, cortando o excesso." },
  repetir: { rotulo: "Repetir", descricao: "A imagem se repete lado a lado, boa para textura." },
  topo: { rotulo: "No topo", descricao: "A imagem aparece inteira no alto, sem cortes." },
};

/**
 * Fundo da página, por cima do tema claro ou escuro.
 * Sem cor e sem imagem, vale o fundo padrão do tema.
 */
export type FundoPagina = {
  cor: string | null;
  imagemUrl: string | null;
  imagemEstilo: EstiloImagem;
  /** Quanto o véu do tema cobre a imagem, de 0 a 90 por cento. */
  veu: number;
};

export const LADOS = ["direita", "esquerda"] as const;
export type LadoResumo = (typeof LADOS)[number];

export type Aparencia = {
  modelo: Modelo;
  fundo: Fundo;
  fundoPagina: FundoPagina;
  ladoResumo: LadoResumo;
  ordem: Bloco[];
  tipografia: Tipografia;
  corPrincipal: string;
  bannerUrl: string | null;
  titulo: string | null;
  subtitulo: string | null;
  textoBotao: string | null;
  cronometro: { ativo: boolean; minutos: number; texto: string };
  garantia: { ativo: boolean; dias: number; texto: string };
  depoimentos: Depoimento[];
};

export type AparenciaParcial = Partial<Aparencia>;

export const APARENCIA_PADRAO: Aparencia = {
  modelo: "classico",
  fundo: "claro",
  fundoPagina: { cor: null, imagemUrl: null, imagemEstilo: "cobrir", veu: 0 },
  ladoResumo: "direita",
  ordem: [...BLOCOS],
  tipografia: { fonte: "sistema", alinhamento: "esquerda", tituloTamanho: 30, tituloNegrito: true, tituloItalico: false },
  corPrincipal: "#0b3dff",
  bannerUrl: null,
  titulo: null,
  subtitulo: null,
  textoBotao: null,
  cronometro: { ativo: false, minutos: 15, texto: "Oferta reservada por" },
  garantia: { ativo: false, dias: 7, texto: "Se não for para você, devolvemos o valor integral." },
  depoimentos: [],
};

/** Chaves de nível superior: a mesclagem acontece nesse nível, sem misturar objetos pela metade. */
const CHAVES = Object.keys(APARENCIA_PADRAO) as (keyof Aparencia)[];

/** Resolve a aparência efetiva: padrão da loja, com o que o link sobrescreve por cima. */
export function mesclarAparencia(padrao: AparenciaParcial | null, doLink: AparenciaParcial | null): Aparencia {
  const resultado = { ...APARENCIA_PADRAO };
  for (const chave of CHAVES) {
    const valorPadrao = padrao?.[chave];
    if (valorPadrao !== undefined && valorPadrao !== null) Object.assign(resultado, { [chave]: valorPadrao });
    const valorLink = doLink?.[chave];
    if (valorLink !== undefined) Object.assign(resultado, { [chave]: valorLink });
  }
  return resultado;
}

/** Guarda só o que difere do padrão, para o link continuar herdando o resto. */
export function diferencaDoPadrao(padrao: Aparencia, escolhida: Aparencia): AparenciaParcial {
  const parcial: AparenciaParcial = {};
  for (const chave of CHAVES) {
    if (JSON.stringify(escolhida[chave]) !== JSON.stringify(padrao[chave])) {
      Object.assign(parcial, { [chave]: escolhida[chave] });
    }
  }
  return parcial;
}

/** Quais campos deste link estão sobrescritos (usado para mostrar "personalizado" na interface). */
export function camposPersonalizados(doLink: AparenciaParcial | null): (keyof Aparencia)[] {
  if (!doLink) return [];
  return CHAVES.filter((c) => doLink[c] !== undefined);
}

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const schemaAparencia = z.object({
  modelo: z.enum(MODELOS).optional(),
  fundo: z.enum(FUNDOS).optional(),
  fundoPagina: z
    .object({
      cor: z
        .union([z.literal(""), z.string().refine(ehHexValido, "Use uma cor em hexadecimal, como #0B3DFF.")])
        .nullable()
        .transform((v) => (v ? v : null)),
      imagemUrl: z.union([z.literal(""), z.string().trim().max(500)]).nullable().transform((v) => (v ? v : null)),
      imagemEstilo: z.enum(ESTILOS_IMAGEM),
      veu: z.number().int().min(0).max(90),
    })
    .optional(),
  ladoResumo: z.enum(LADOS).optional(),
  tipografia: z
    .object({
      fonte: z.string().refine((v) => IDS_FONTES.includes(v), "Fonte não disponível."),
      alinhamento: z.enum(ALINHAMENTOS),
      tituloTamanho: z.number().int().min(16, "Mínimo de 16 pixels.").max(64, "Máximo de 64 pixels."),
      tituloNegrito: z.boolean(),
      tituloItalico: z.boolean(),
    })
    .optional(),
  ordem: z
    .array(z.enum(BLOCOS))
    .optional()
    // Completa o que faltar e remove repetidos, para nunca sumir um bloco por engano.
    .transform((v) => (v ? ([...new Set(v), ...BLOCOS.filter((b) => !v.includes(b))] as Bloco[]) : undefined)),
  corPrincipal: z.string().refine(ehHexValido, "Use uma cor em hexadecimal, como #0B3DFF.").optional(),
  bannerUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  titulo: textoOpcional(80),
  subtitulo: textoOpcional(160),
  textoBotao: textoOpcional(40),
  cronometro: z
    .object({
      ativo: z.boolean(),
      minutos: z.number().int().min(1, "Mínimo de 1 minuto.").max(120, "Máximo de 120 minutos."),
      texto: z.string().trim().max(60),
    })
    .optional(),
  garantia: z
    .object({
      ativo: z.boolean(),
      dias: z.number().int().min(1).max(365),
      texto: z.string().trim().max(200),
    })
    .optional(),
  depoimentos: z
    .array(
      z.object({
        nome: z.string().trim().min(2, "Informe quem falou.").max(60),
        texto: z.string().trim().min(5, "Escreva o depoimento.").max(300),
        nota: z.number().int().min(1).max(5),
      }),
    )
    .max(6, "No máximo 6 depoimentos.")
    .optional(),
});

/** Converte o que veio do banco (jsonb) em algo com o formato certo, ignorando lixo. */
export function lerAparencia(bruto: unknown): AparenciaParcial | null {
  if (!bruto || typeof bruto !== "object") return null;
  const r = schemaAparencia.safeParse(bruto);
  return r.success ? (r.data as AparenciaParcial) : null;
}
