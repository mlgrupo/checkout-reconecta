import { z } from "zod";
import { ehHexValido } from "@/lib/cores";

/**
 * Aparência do checkout: o que o editor controla.
 * Existe um padrão da loja (tabela `configuracoes`, chave `aparencia`) e um ajuste por link
 * (`links_checkout.aparencia`), que guarda só os campos diferentes do padrão.
 */

export type Depoimento = { nome: string; texto: string; nota: number };

export type Aparencia = {
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
