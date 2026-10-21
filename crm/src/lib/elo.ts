/* Tradução Lead (CRM) → Contato (Elo). Usado no navegador (prévia) e no servidor (envio). */
import { origin } from "./constants";
import { findFunnel, findStage, leadPerfil, PERFIL_LABEL } from "./domain";
import type { Funnel, Lead } from "./types";
import { normalizePhone } from "./utils";

export interface EloContactPayload {
  crmId: string;
  nome: string;
  telefone: string;
  email?: string;
  campos: Record<string, string>;
  etiquetas: string[];
  /** nome da cadência no Elo (opcional) */
  cadencia?: string;
  cadenciaZerar?: boolean;
}

export type EloPrep = { ok: true; contact: EloContactPayload } | { ok: false; crmId: string; nome: string; motivo: string };

export { normalizePhone };

export function prepareLead(l: Lead, funnels: Funnel[], extraTags: string[] = [], cadencia?: { nome: string; zerar: boolean }): EloPrep {
  const tel = normalizePhone(l.phone);
  if (!l.phone) return { ok: false, crmId: l.id, nome: l.name, motivo: "Sem telefone" };
  if (!tel) return { ok: false, crmId: l.id, nome: l.name, motivo: `Telefone inválido (${l.phone})` };
  const f = findFunnel(funnels, l.funnelId);
  const s = findStage(f, l.stageId);
  const perfil = leadPerfil(l, funnels);
  const o = origin(l.origin);
  const campos: Record<string, string> = {
    crm_id: l.id,
    origem: o.label,
    veterinario: l.isVet ? "sim" : "não",
    entrada_crm: l.date,
  };
  if (l.company) campos.empresa = l.company;
  if (l.instagram) campos.instagram = l.instagram;
  if (f) campos.funil = f.name;
  if (s) campos.etapa = s.name;
  if (perfil) campos.perfil = PERFIL_LABEL[perfil];
  if (l.value) campos.valor_estimado = String(l.value);
  if (l.followUp) campos.proximo_contato = l.followUp;
  if (l.converted) campos.cliente = "sim";

  const etiquetas = new Set<string>(["CRM"]);
  if (f) etiquetas.add(f.name);
  etiquetas.add(o.label);
  if (perfil) etiquetas.add(PERFIL_LABEL[perfil]);
  if (l.converted) etiquetas.add("Cliente");
  for (const t of extraTags) if (t.trim()) etiquetas.add(t.trim());

  return {
    ok: true,
    contact: { crmId: l.id, nome: l.name.trim(), telefone: tel, email: l.email || undefined, campos, etiquetas: [...etiquetas], ...(cadencia?.nome ? { cadencia: cadencia.nome, cadenciaZerar: cadencia.zerar } : {}) },
  };
}

export interface EloResult {
  crmId: string;
  ok: boolean;
  eloId?: string;
  erro?: string;
}
