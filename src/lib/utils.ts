import { clsx, type ClassValue } from "clsx";

/** Junta classes condicionais (wrapper fino sobre clsx). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Iniciais para avatar: "Ana Souza" → "AS". */
export function iniciais(nome?: string | null, email?: string | null) {
  const base = (nome?.trim() || email?.split("@")[0] || "?").replace(/[._-]+/g, " ");
  const partes = base.split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/** Data relativa em pt-BR: "há 3 minutos", "há 2 dias". */
export function tempoRelativo(iso?: string | null) {
  if (!iso) return "nunca";
  const alvo = new Date(iso).getTime();
  if (Number.isNaN(alvo)) return "—";
  const diff = Date.now() - alvo;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const min = Math.round(diff / 60_000);
  if (Math.abs(min) < 60) return rtf.format(-min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(-h, "hour");
  const d = Math.round(h / 24);
  if (Math.abs(d) < 30) return rtf.format(-d, "day");
  const m = Math.round(d / 30);
  if (Math.abs(m) < 12) return rtf.format(-m, "month");
  return rtf.format(-Math.round(m / 12), "year");
}

export function formatarData(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}
