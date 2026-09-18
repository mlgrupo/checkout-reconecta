/**
 * Utilidades de cor para o editor de checkout. Sem dependências: usável no cliente e no servidor.
 * Trabalhamos em HSL para gerar as variações (hover, fundo suave) a partir de uma cor só.
 */

export type Hsl = { h: number; s: number; l: number };

export function ehHexValido(valor: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(valor.trim());
}

export function normalizarHex(valor: string) {
  const v = valor.trim().toLowerCase();
  if (!ehHexValido(v)) return null;
  if (v.length === 4) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v;
}

export function hexParaRgb(hex: string) {
  const n = normalizarHex(hex) ?? "#000000";
  return { r: parseInt(n.slice(1, 3), 16), g: parseInt(n.slice(3, 5), 16), b: parseInt(n.slice(5, 7), 16) };
}

export function hexParaHsl(hex: string): Hsl {
  const { r, g, b } = hexParaRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslParaHex({ h, s, l }: Hsl) {
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const faixa = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][faixa];
  const para = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${para(r1)}${para(g1)}${para(b1)}`;
}

/** Luminância relativa (WCAG), usada para escolher texto claro ou escuro sobre a cor. */
export function luminancia(hex: string) {
  const { r, g, b } = hexParaRgb(hex);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(a: string, b: string) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Cor de texto legível sobre um fundo: branco ou o navy do design system. */
export function corDeTextoSobre(fundo: string) {
  return contraste(fundo, "#ffffff") >= 4.5 ? "#ffffff" : "#0a1633";
}

/**
 * Gera a escala usada pelo checkout a partir de uma cor principal.
 * Os nomes espelham os tokens do design system, então o tema é aplicado só
 * sobrescrevendo as variáveis CSS num contêiner.
 */
export function escalaDaCor(corPrincipal: string) {
  const base = normalizarHex(corPrincipal) ?? "#0b3dff";
  const { h, s, l } = hexParaHsl(base);
  const saturada = Math.max(s, 25);
  return {
    "--color-azul": base,
    "--color-azul-escuro": hslParaHex({ h, s: saturada, l: Math.max(12, l - 12) }),
    "--color-azul-profundo": hslParaHex({ h, s: saturada, l: Math.max(8, l - 22) }),
    "--color-azul-medio": hslParaHex({ h, s: saturada, l: Math.min(78, l + 22) }),
    "--color-azul-claro": hslParaHex({ h, s: Math.min(saturada, 70), l: Math.min(94, l + 42) }),
    "--cor-sobre-primaria": corDeTextoSobre(base),
  } as Record<string, string>;
}
