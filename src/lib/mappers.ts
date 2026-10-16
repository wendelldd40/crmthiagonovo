/* Conversão linha do banco ↔ objeto da tela. Idênticos aos do CRM antigo. */
import type { Funnel, Lead, Mentorship, Task } from "./types";
import { today } from "./utils";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function mapFunnel(r: Row): Funnel {
  return { id: r.id, name: r.name, icon: r.icon || "📋", color: r.color || "#2d9d8f", stages: r.stages || [] };
}

export function mapLead(r: Row): Lead {
  return {
    id: r.id,
    name: r.name,
    email: r.email || "",
    phone: r.phone || "",
    instagram: r.instagram || "",
    company: r.company || "",
    origin: r.origin || "ig_comentario",
    isVet: r.is_vet !== false,
    funnelId: r.funnel_id,
    stageId: r.stage_id,
    value: Number(r.value) || 0,
    tags: r.tags || [],
    notes: r.notes || "",
    followUp: r.follow_up || "",
    converted: r.converted || false,
    convertedDate: r.converted_date || "",
    serviceMonths: r.service_months || 0,
    activities: r.activities || [],
    date: r.date || today(),
    elo:
      r.elo_contatos || r.elo_cadencia || r.elo_respostas
        ? {
            contatos: Number(r.elo_contatos) || 0,
            total: r.elo_total ?? null,
            cadencia: r.elo_cadencia ?? null,
            ultimoContato: r.elo_ultimo_contato ?? null,
            ultimoTipo: r.elo_ultimo_tipo ?? null,
            respostas: Number(r.elo_respostas) || 0,
            ultimaResposta: r.elo_ultima_resposta ?? null,
            status: r.elo_status ?? null,
          }
        : null,
  };
}

export function mapTask(r: Row): Task {
  return {
    id: r.id,
    title: r.title,
    desc: r.description || "",
    priority: r.priority || "media",
    status: r.status || "pendente",
    deadline: r.deadline || "",
    createdAt: r.created_at,
  };
}

export function mapMentorship(r: Row): Mentorship {
  return {
    id: r.id,
    client: r.client,
    type: r.type || "Mentoria Individual",
    hoursPerSession: Number(r.hours_per_session) || 1,
    sessionsPerWeek: Number(r.sessions_per_week) || 1,
    totalWeeks: Number(r.total_weeks) || 4,
    startDate: r.start_date || "",
    endDate: r.end_date || "",
    active: r.active !== false,
    value: Number(r.value) || 0,
    notes: r.notes || "",
    scheduleType: r.schedule_type || "nenhuma",
    scheduleDayOfWeek: r.schedule_day_of_week ?? null,
    scheduleDayOfMonth: r.schedule_day_of_month || null,
    scheduleIntervalDays: r.schedule_interval_days || null,
    scheduleSessions: r.schedule_sessions || [],
  };
}

export function leadToDb(l: Partial<Lead>) {
  return {
    name: l.name,
    email: l.email || null,
    phone: l.phone || null,
    instagram: l.instagram || null,
    company: l.company || null,
    origin: l.origin,
    is_vet: l.isVet,
    funnel_id: l.funnelId || null,
    stage_id: l.stageId || null,
    value: l.value || 0,
    tags: l.tags || [],
    notes: l.notes || null,
    follow_up: l.followUp || null,
    converted: l.converted || false,
    converted_date: l.convertedDate || null,
    service_months: l.serviceMonths || 0,
    activities: l.activities || [],
    date: l.date || today(),
  };
}

/** Só os campos alterados — evita sobrescrever o lead inteiro em ações pequenas. */
export function leadPatchToDb(p: Partial<Lead>) {
  const map: Record<string, string> = {
    name: "name", email: "email", phone: "phone", instagram: "instagram", company: "company", origin: "origin",
    isVet: "is_vet", funnelId: "funnel_id", stageId: "stage_id", value: "value", tags: "tags", notes: "notes",
    followUp: "follow_up", converted: "converted", convertedDate: "converted_date", serviceMonths: "service_months",
    activities: "activities", date: "date",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    const col = map[k];
    if (!col) continue;
    out[col] = v === "" ? null : v;
  }
  return out;
}

export function taskToDb(t: Partial<Task>) {
  return { title: t.title, description: t.desc || null, priority: t.priority, status: t.status, deadline: t.deadline || null };
}

export function mentorshipToDb(m: Partial<Mentorship>) {
  return {
    client: m.client,
    type: m.type,
    hours_per_session: m.hoursPerSession,
    sessions_per_week: m.sessionsPerWeek,
    total_weeks: m.totalWeeks,
    start_date: m.startDate || null,
    end_date: m.endDate || null,
    active: m.active,
    value: m.value || 0,
    notes: m.notes || null,
    schedule_type: m.scheduleType || "nenhuma",
    schedule_day_of_week: m.scheduleDayOfWeek ?? null,
    schedule_day_of_month: m.scheduleDayOfMonth || null,
    schedule_interval_days: m.scheduleIntervalDays || null,
    schedule_sessions: m.scheduleSessions || [],
  };
}
