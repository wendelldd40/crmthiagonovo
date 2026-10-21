import "server-only";
import { normalizePhone, type EloContactPayload, type EloResult } from "@/lib/elo";

export const ELO_URL = (process.env.ELO_API_URL ?? "").trim().replace(/\/+$/, "");
const ELO_KEY = (process.env.ELO_API_KEY ?? "").trim();
export const ELO_CONFIGURED = /^https?:\/\//.test(ELO_URL) && ELO_KEY.startsWith("elo_");

/** Chamada genérica à API v1 do Elo (servidor → servidor, com a chave do Elo). */
export async function eloApi<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T & { erro?: string } }> {
  try {
    const res = await fetch(`${ELO_URL}/api/v1/${path}`, {
      method: init?.method ?? "GET",
      headers: { "content-type": "application/json", authorization: `Bearer ${ELO_KEY}` },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return { ok: false, status: 401, data: { erro: "Chave do Elo inválida (confira ELO_API_KEY)" } as T & { erro?: string } };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 502, data: { erro: "Não foi possível alcançar o Elo" } as T & { erro?: string } };
  }
}

const cut = (s: unknown, n: number) => String(s ?? "").slice(0, n);

/** Revalida tudo que veio do navegador antes de repassar ao Elo. */
export function sanitize(c: unknown): EloContactPayload | null {
  if (!c || typeof c !== "object") return null;
  const x = c as Record<string, unknown>;
  const telefone = normalizePhone(String(x.telefone ?? ""));
  const nome = cut(x.nome, 120).trim();
  const crmId = cut(x.crmId, 64);
  if (!telefone || !nome || !crmId) return null;
  const campos: Record<string, string> = {};
  if (x.campos && typeof x.campos === "object") {
    for (const [k, v] of Object.entries(x.campos as Record<string, unknown>).slice(0, 30)) {
      if (/^[a-z0-9_]{1,40}$/.test(k)) campos[k] = cut(v, 300);
    }
  }
  const etiquetas = Array.isArray(x.etiquetas) ? x.etiquetas.slice(0, 15).map((t) => cut(t, 60).trim()).filter(Boolean) : [];
  const email = x.email ? cut(x.email, 160) : undefined;
  const cadencia = x.cadencia ? cut(x.cadencia, 80) : undefined;
  return { crmId, nome, telefone, email, campos, etiquetas, cadencia, cadenciaZerar: !!x.cadenciaZerar };
}

export async function enviarContato(c: EloContactPayload): Promise<EloResult> {
  try {
    const res = await fetch(`${ELO_URL}/api/v1/contatos`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ELO_KEY}` },
      body: JSON.stringify({ nome: c.nome, telefone: c.telefone, email: c.email, campos: c.campos, etiquetas: c.etiquetas, ...(c.cadencia ? { cadencia: c.cadencia, cadencia_zerar: c.cadenciaZerar } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const erro = res.status === 401 ? "Chave do Elo inválida (confira ELO_API_KEY)" : body.erro || `Elo respondeu ${res.status}`;
      return { crmId: c.crmId, ok: false, erro };
    }
    return { crmId: c.crmId, ok: true, eloId: body.id };
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "Elo não respondeu em 15s" : "Não foi possível alcançar o Elo";
    return { crmId: c.crmId, ok: false, erro: msg };
  }
}
