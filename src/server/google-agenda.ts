/* Escreve os compromissos direto num calendário do Google Agenda.
 *
 * Usa uma CONTA DE SERVIÇO, não o login de cada pessoa. A diferença importa:
 * conta de serviço não tem tela de consentimento, não passa pela verificação do
 * Google e a autorização não expira em 7 dias (que é o que acontece com app
 * OAuth não verificado). Em troca, ela só enxerga o calendário que foi
 * compartilhado com o e-mail dela.
 *
 * O desenho é: um calendário dedicado ("ThiagoCRM · Agenda"), compartilhado com
 * a conta de serviço (pode editar) e com cada pessoa da equipe (pode ver). O CRM
 * grava ali e todo mundo vê na hora, inclusive no iPhone com a conta Google ligada.
 *
 * Limite conhecido: conta de serviço em conta Gmail comum não consegue mandar
 * convite para terceiros (precisaria de delegação do Workspace). Não é problema
 * aqui — o calendário já é compartilhado, ninguém precisa ser convidado.
 *
 * Configuração em docs/google-agenda.md.
 */

import { createSign } from "node:crypto";
import { TIPOS_COMPROMISSO } from "@/lib/constants";
import { TZ } from "@/lib/ics";
import type { Compromisso } from "@/lib/types";

const ESCOPO = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export interface GoogleConfig {
  email: string;
  chave: string;
  calendario: string;
}

/** Lê as variáveis de ambiente. Devolve null quando a ligação não foi configurada. */
export function googleConfig(): GoogleConfig | null {
  const email = (process.env.GOOGLE_SA_EMAIL || "").trim();
  const calendario = (process.env.GOOGLE_CALENDAR_ID || "").trim();
  // a chave vem do JSON com \n escapado; na Vercel o valor é colado numa linha só
  const chave = (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!email || !chave || !calendario) return null;
  return { email, chave, calendario };
}

export const googleLigado = () => googleConfig() !== null;

/* ── Autenticação ─────────────────────────────────────────────────────────── */

const base64url = (b: Buffer | string) =>
  (Buffer.isBuffer(b) ? b : Buffer.from(b)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Token de acesso, guardado em memória até perto de vencer (vale 1 hora). */
let cache: { token: string; vence: number } | null = null;

/** Monta e assina o JWT que o Google troca por um token de acesso. Exportado para teste. */
export function montarJwt(cfg: GoogleConfig, agora = Math.floor(Date.now() / 1000)) {
  const cabecalho = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({ iss: cfg.email, scope: ESCOPO, aud: TOKEN_URL, iat: agora, exp: agora + 3600 }),
  );
  const assinatura = base64url(createSign("RSA-SHA256").update(`${cabecalho}.${corpo}`).sign(cfg.chave));
  return `${cabecalho}.${corpo}.${assinatura}`;
}

async function acessar(cfg: GoogleConfig) {
  if (cache && cache.vence > Date.now() + 60_000) return cache.token;

  const jwt = montarJwt(cfg);

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error(explicar(j, r.status));
  }
  cache = { token: j.access_token as string, vence: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cache.token;
}

/** Traduz o erro do Google para algo que dá para agir. */
function explicar(j: Record<string, unknown>, status: number) {
  const desc = String(j.error_description || j.error || "");
  if (/invalid_grant/i.test(desc)) return "Chave da conta de serviço recusada. Confira GOOGLE_SA_EMAIL e GOOGLE_SA_PRIVATE_KEY.";
  if (/Invalid JWT Signature/i.test(desc)) return "A chave privada está incompleta. Cole o valor inteiro, com BEGIN e END.";
  return desc || `Google respondeu ${status}.`;
}

/* ── Montagem do evento ───────────────────────────────────────────────────── */

/** Cores do Google (1 a 11) mais próximas das que o CRM usa por tipo. */
const COR: Record<string, string> = { diagnostico: "2", reuniao: "7", mentoria: "3", ligacao: "6", outro: "8" };

const diaSeguinte = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

function fim(c: Compromisso) {
  const [h, m] = (c.hora || "00:00").split(":").map(Number);
  const d = new Date(c.data + "T00:00:00");
  d.setHours(h, m + (c.duracaoMin || 60), 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function detalhes(c: Compromisso, urlCrm?: string) {
  const l: string[] = [];
  if (c.leadNome) l.push(`Lead: ${c.leadNome}`);
  if (c.leadTelefone) l.push(`WhatsApp: ${c.leadTelefone}`);
  if (c.responsavelNome) l.push(`Responsável: ${c.responsavelNome}`);
  if (c.marcadoPorNome) l.push(`Marcado por: ${c.marcadoPorNome}`);
  if (c.observacoes) l.push("", c.observacoes);
  if (urlCrm) l.push("", `Abrir no CRM: ${urlCrm}`);
  return l.join("\n");
}

/** Evento no formato que a API do Google espera. Exportado para teste. */
export function corpoEvento(c: Compromisso, urlCrm?: string) {
  const tipo = TIPOS_COMPROMISSO[c.tipo]?.label ?? "Compromisso";
  const titulo = c.titulo || tipo;
  const aberto = c.status === "agendado" || c.status === "confirmado";
  return {
    summary: c.leadNome ? `${titulo} — ${c.leadNome}` : titulo,
    description: detalhes(c, urlCrm),
    location: c.local || undefined,
    colorId: COR[c.tipo] ?? "8",
    status: c.status === "cancelado" ? "cancelled" : c.status === "agendado" ? "tentative" : "confirmed",
    transparency: c.status === "cancelado" ? "transparent" : "opaque",
    start: c.hora
      ? { dateTime: `${c.data}T${c.hora}:00`, timeZone: TZ }
      : { date: c.data },
    end: c.hora
      ? { dateTime: fim(c), timeZone: TZ }
      : { date: diaSeguinte(c.data) },
    reminders: c.hora && aberto
      ? { useDefault: false, overrides: [{ method: "popup", minutes: c.tipo === "ligacao" ? 10 : 30 }] }
      : { useDefault: false, overrides: [] },
    // marca a origem, para não confundir com evento criado à mão no Google
    source: urlCrm ? { title: "ThiagoCRM", url: urlCrm } : undefined,
    extendedProperties: { private: { crmId: c.id, crmTipo: c.tipo } },
  };
}

/* ── Operações ────────────────────────────────────────────────────────────── */

async function chamar(cfg: GoogleConfig, caminho: string, init: RequestInit) {
  const token = await acessar(cfg);
  const r = await fetch(`${API}/calendars/${encodeURIComponent(cfg.calendario)}${caminho}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (r.status === 404) return { ausente: true, dados: null as unknown };
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = j.error?.message || `Google respondeu ${r.status}.`;
    throw new Error(
      r.status === 403 || r.status === 404
        ? `${msg} Confira se o calendário foi compartilhado com ${cfg.email} com permissão de alterar eventos.`
        : msg,
    );
  }
  return { ausente: false, dados: r.status === 204 ? null : await r.json() };
}

/**
 * Cria ou atualiza o evento. Devolve o id do evento no Google, para guardar no
 * compromisso — é por ele que a próxima edição encontra o evento certo.
 */
export async function gravarEvento(c: Compromisso, urlCrm?: string): Promise<string | null> {
  const cfg = googleConfig();
  if (!cfg) return null;
  const corpo = JSON.stringify(corpoEvento(c, urlCrm));

  if (c.googleEventId) {
    const r = await chamar(cfg, `/events/${encodeURIComponent(c.googleEventId)}`, { method: "PATCH", body: corpo });
    // apagado à mão no Google: recria em vez de ficar quebrado para sempre
    if (!r.ausente) return c.googleEventId;
  }
  const r = await chamar(cfg, "/events", { method: "POST", body: corpo });
  return ((r.dados as { id?: string } | null)?.id as string) ?? null;
}

/** Tira o evento do calendário. Já apagado conta como sucesso. */
export async function apagarEvento(googleEventId: string) {
  const cfg = googleConfig();
  if (!cfg || !googleEventId) return;
  await chamar(cfg, `/events/${encodeURIComponent(googleEventId)}`, { method: "DELETE" });
}

/** Testa a ligação sem mexer em nada: lê os dados do calendário. */
export async function testarLigacao(): Promise<{ ok: boolean; nome?: string; erro?: string }> {
  const cfg = googleConfig();
  if (!cfg) return { ok: false, erro: "Ligação não configurada." };
  try {
    const token = await acessar(cfg);
    const r = await fetch(`${API}/calendars/${encodeURIComponent(cfg.calendario)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const j = (await r.json()) as { summary?: string };
      return { ok: true, nome: j.summary };
    }
    const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      ok: false,
      erro:
        r.status === 404
          ? `Calendário não encontrado. Confira o GOOGLE_CALENDAR_ID e se ele foi compartilhado com ${cfg.email}.`
          : r.status === 403
            ? `Sem permissão. Compartilhe o calendário com ${cfg.email} marcando "Fazer alterações nos eventos".`
            : j.error?.message || `Google respondeu ${r.status}.`,
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao falar com o Google." };
  }
}
