/**
 * Formatação e validação de valores brasileiros. Sem dependências; usável no cliente e no servidor.
 */

export function dinheiro(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/** "R$ 1.234,56" | "1234,56" | "1234.56" → centavos (inteiro). Retorna null se inválido. */
export function paraCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  // Se tem vírgula, ela é o separador decimal; pontos são milhares.
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function somenteDigitos(v: string) {
  return v.replace(/\D/g, "");
}

export function mascararCpfCnpj(v: string) {
  const d = somenteDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function mascararTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function mascararCep(v: string) {
  return somenteDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function mascararCartao(v: string) {
  return somenteDigitos(v)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function mascararValidade(v: string) {
  const d = somenteDigitos(v).slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function validarCpf(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (tam: number) => {
    let soma = 0;
    for (let i = 0; i < tam; i++) soma += Number(d[i]) * (tam + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function validarCnpj(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (tam: number) => {
    const pesos = tam === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tam; i++) soma += Number(d[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function validarCpfCnpj(valor: string) {
  const d = somenteDigitos(valor);
  return d.length === 11 ? validarCpf(d) : d.length === 14 ? validarCnpj(d) : false;
}

export function validarEmail(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

export function validarTelefone(valor: string) {
  const d = somenteDigitos(valor);
  return d.length === 10 || d.length === 11;
}

/** Algoritmo de Luhn para número de cartão. */
export function validarNumeroCartao(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/** "MM/AA" ou "MM/AAAA" → { mes: "MM", ano: "AAAA" } ou null se inválido/vencido. */
export function validadeCartao(valor: string): { mes: string; ano: string } | null {
  const d = somenteDigitos(valor);
  if (d.length !== 4 && d.length !== 6) return null;
  const mes = Number(d.slice(0, 2));
  const anoBruto = d.slice(2);
  const ano = anoBruto.length === 2 ? 2000 + Number(anoBruto) : Number(anoBruto);
  if (mes < 1 || mes > 12) return null;
  const agora = new Date();
  const fim = new Date(ano, mes, 0, 23, 59, 59);
  if (fim < agora) return null;
  return { mes: String(mes).padStart(2, "0"), ano: String(ano) };
}

/** Slug para URLs: "Curso de Vendas 2.0" → "curso-de-vendas-2-0". */
export function slugificar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Código curto para links públicos (sem caracteres ambíguos). */
export function codigoCurto(tamanho = 8) {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function dataIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function adicionarDias(d: Date, dias: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Data em pt-BR (fuso de São Paulo). */
export function dataBr(iso?: string | Date | null, opcoes: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" }) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opcoes }).format(d);
}
