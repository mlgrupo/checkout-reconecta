// Recolore a marca da Reconecta: os tons de vermelho viram dourado, mantendo a
// diferença de claro e escuro entre eles para o emblema não virar uma mancha só.
const fs = require("node:fs");

const DOURADO = { h: 43, s: 68 }; // #C9A227, o dourado do design system

function hexParaHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

function hslParaHex({ h, s, l }) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const faixa = Math.floor((((h % 360) + 360) % 360) / 60);
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][faixa];
  const p = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${p(r1)}${p(g1)}${p(b1)}`.toUpperCase();
}

const ehVermelho = (h) => h <= 25 || h >= 335;

/** Mapeia a luminosidade original (vermelhos escuros) para a faixa do dourado. */
function dourar(hex, faixa) {
  const { h, l } = hexParaHsl(hex);
  if (!ehVermelho(h)) return null;
  const alvo = faixa.min + ((l - faixa.origemMin) / (faixa.origemMax - faixa.origemMin || 1)) * (faixa.max - faixa.min);
  return hslParaHex({ h: DOURADO.h, s: DOURADO.s, l: Math.max(faixa.min, Math.min(faixa.max, alvo)) });
}

function processar(caminho, faixa) {
  let svg = fs.readFileSync(caminho, "utf8");
  const encontrados = [...new Set(svg.match(/#[0-9A-Fa-f]{6}/g) || [])];
  const vermelhos = encontrados.filter((c) => ehVermelho(hexParaHsl(c).h));
  const luzes = vermelhos.map((c) => hexParaHsl(c).l);
  const origem = { origemMin: Math.min(...luzes), origemMax: Math.max(...luzes) };
  const mapa = {};
  for (const cor of vermelhos) {
    const nova = dourar(cor, { ...faixa, ...origem });
    if (nova) mapa[cor] = nova;
  }
  for (const [de, para] of Object.entries(mapa)) {
    svg = svg.split(de).join(para).split(de.toLowerCase()).join(para);
  }
  fs.writeFileSync(caminho, svg);
  console.log(caminho.split(/[\\/]/).pop(), "→", Object.entries(mapa).map(([d, p]) => `${d}→${p}`).join(", "));
}

// Marca horizontal: cor chapada, vira o dourado exato do sistema.
processar("public/brand/reconecta.svg", { min: 47, max: 47 });
// Emblema: os vermelhos escuros viram dourados de médio a escuro, preservando o relevo.
processar("public/brand/reconecta-simbolo.svg", { min: 38, max: 52 });
