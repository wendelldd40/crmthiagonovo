import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TAG_PLANILHA } from "./config";
import type { Lead } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Data local AAAA-MM-DD (o CRM antigo usava UTC e virava o dia às 21h). */
export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return today(d);
}

export function daysBetween(fromIso: string, toIso: string) {
  const a = new Date(fromIso.slice(0, 10) + "T00:00:00").getTime();
  const b = new Date(toIso.slice(0, 10) + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  const p = d.slice(0, 10).split("-");
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0].slice(2)}`;
}

export function fmtDateLong(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d.slice(0, 10) + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtMoney(v?: number | null) {
  if (!v) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtMoneyCompact(v: number) {
  if (!v) return "R$ 0";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 10_000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return fmtMoney(v);
}

export function initials(n: string) {
  return (n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Número com vírgula decimal (padrão brasileiro). */
export function fmtNum(n: number, dec = 1) {
  return (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

/** Lead operacional = não veio da planilha importada. */
export const isOp = (l: Lead) => !(l.tags || []).includes(TAG_PLANILHA);

export const digits = (s: string) => (s || "").replace(/\D/g, "");

export function phoneFmt(t: string) {
  const d = digits(t);
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/**
 * Normaliza para DDI + DDD + número, só dígitos (o formato que o Elo exige).
 * Números brasileiros sem DDI recebem 55. Retorna null se não der para confiar no número.
 */
export function normalizePhone(raw: string): string | null {
  const explicitDDI = (raw || "").trim().startsWith("+");
  let d = (raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  // "+" na frente = DDI informado (ex.: +1 415…): respeita como está
  if (explicitDDI) return d.length >= 11 && d.length <= 15 ? d : null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.startsWith("55")) return d.length === 12 || d.length === 13 ? d : null;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** O mesmo celular brasileiro com e sem o nono dígito (o WhatsApp usa um ou outro conforme o DDD). */
export function variantesTelefone(normalizado: string): string[] {
  const d = normalizado;
  if (!d.startsWith("55")) return [d];
  if (d.length === 13 && d[4] === "9") return [d, d.slice(0, 4) + d.slice(5)];
  if (d.length === 12 && /[6-9]/.test(d[4])) return [d, d.slice(0, 4) + "9" + d.slice(4)];
  return [d];
}

/** Formato de exibição no CRM: 5571991884805 → (71) 99188-4805 · fora do Brasil fica +DDI… */
export function telefoneParaCrm(normalizado: string) {
  const d = normalizado;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4), n = d.slice(4);
    return `(${ddd}) ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
  }
  return `+${d}`;
}

/** Celular brasileiro (provável WhatsApp) ou fixo, a partir do número já normalizado. */
export function tipoTelefone(normalizado: string | null): "celular" | "fixo" | "exterior" | null {
  if (!normalizado) return null;
  if (!normalizado.startsWith("55")) return "exterior";
  const local = normalizado.slice(4);
  if (local.length === 9 && local[0] === "9") return "celular";
  if (local.length === 8 && /[6-9]/.test(local[0])) return "celular"; // celular antigo, sem o nono dígito
  return "fixo";
}

/** Dois telefones são o mesmo número? (aceita diferença só no nono dígito) */
export function mesmoTelefone(a: string, b: string): boolean {
  const na = normalizePhone(a), nb = normalizePhone(b);
  if (!na || !nb) return false;
  return variantesTelefone(na).includes(nb);
}

export function normalize(s: string) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matches(l: Lead, q: string) {
  const n = normalize(q.trim());
  if (!n) return true;
  return (
    normalize(l.name).includes(n) ||
    normalize(l.email).includes(n) ||
    normalize(l.instagram).includes(n) ||
    normalize(l.company).includes(n) ||
    (digits(q).length >= 3 && digits(l.phone).includes(digits(q)))
  );
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

/** Executa `fn` em paralelo limitado. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
