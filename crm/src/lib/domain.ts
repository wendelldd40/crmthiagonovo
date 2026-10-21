/* Regras de negócio portadas do CRM antigo, sem mudar comportamento
   (exceto onde marcado como CORREÇÃO). */
import { FOLLOWUP_RULES, MONTHS } from "./constants";
import type { Funnel, Lead, Mentorship, Stage } from "./types";
import { TAG_ABORDADO, TAG_PLANILHA } from "./config";
import { daysBetween, digits, isOp, normalizePhone, today } from "./utils";

export const findFunnel = (funnels: Funnel[], id: string | null) => funnels.find((f) => f.id === id);
export const findStage = (f: Funnel | undefined, id: string | null) => f?.stages.find((s) => s.id === id);

export function isClosed(l: Lead, funnels: Funnel[]) {
  const f = findFunnel(funnels, l.funnelId);
  const last = f?.stages[f.stages.length - 1];
  return !!last && l.stageId === last.id;
}

/* ───────────────── Follow-up ───────────────── */

export type FollowKind = "atrasado" | "hoje" | "auto";

export interface FollowItem {
  kind: FollowKind;
  lead: Lead;
  stage?: Stage;
  rule?: (typeof FOLLOWUP_RULES)[number];
  diffDays: number;
  overdue: boolean;
  snoozeDays: number;
}

export function followRule(stageName?: string) {
  if (!stageName) return null;
  const lower = stageName.toLowerCase();
  return FOLLOWUP_RULES.find((r) => r.match.some((m) => lower.includes(m))) ?? null;
}

export function followStatus(l: Lead, now = today()): "overdue" | "today" | "upcoming" | null {
  if (!l.followUp) return null;
  return l.followUp < now ? "overdue" : l.followUp === now ? "today" : "upcoming";
}

/** Central de follow-ups: manuais atrasados, manuais de hoje e alertas automáticos por etapa. */
export function followUps(leads: Lead[], funnels: Funnel[], now = today()): FollowItem[] {
  const out: FollowItem[] = [];
  for (const l of leads) {
    if (l.converted || !isOp(l)) continue;
    if (l.followUp && l.followUp < now) {
      out.push({ kind: "atrasado", lead: l, diffDays: daysBetween(l.followUp, now), overdue: true, snoozeDays: 2 });
      continue;
    }
    if (l.followUp === now) {
      out.push({ kind: "hoje", lead: l, diffDays: 0, overdue: false, snoozeDays: 1 });
      continue;
    }
    if (l.followUp && l.followUp > now) continue; // já tem próximo contato marcado
    const f = findFunnel(funnels, l.funnelId);
    const s = findStage(f, l.stageId);
    const rule = followRule(s?.name);
    if (!s || !rule) continue;
    let last = l.date;
    const lastAct = l.activities?.[l.activities.length - 1];
    if (lastAct?.time) last = today(new Date(lastAct.time));
    const diff = daysBetween(last, now);
    if (diff >= rule.days) {
      out.push({ kind: "auto", lead: l, stage: s, rule, diffDays: diff, overdue: diff > rule.days * 2, snoozeDays: rule.days });
    }
  }
  const rank = { atrasado: 0, hoje: 1, auto: 2 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || Number(b.overdue) - Number(a.overdue) || b.diffDays - a.diffDays);
}

/* ───────────────── Abordagem (planilha) ───────────────── */

export type Perfil = "gestor" | "autonomo";
export type Recencia = "quente" | "morno" | "frio";
export type Genero = "feminino" | "masculino" | "neutro";

export function funnelPerfil(f?: Funnel): Perfil | null {
  if (!f) return null;
  const n = f.name.toLowerCase();
  if (n.includes("gestor")) return "gestor";
  if (n.includes("autôn") || n.includes("auton")) return "autonomo";
  return null;
}

export const leadPerfil = (l: Lead, funnels: Funnel[]) => funnelPerfil(findFunnel(funnels, l.funnelId));

export function recencia(date: string): Recencia {
  if (!date) return "frio";
  const days = daysBetween(date, today());
  if (days <= 90) return "quente";
  if (days <= 240) return "morno";
  return "frio";
}

const FEM = new Set("ana maria julia júlia camila fernanda beatriz larissa amanda leticia letícia carolina patricia patrícia gabriela rafaela bruna carla claudia cláudia daniela elaine fabiana giovanna helena isabela jessica jéssica karen luana mariana natalia natália priscila roberta sabrina simone tatiana vanessa viviane yasmin aline alice andressa bianca cristiane daiane edna flavia flávia gisele ingrid joyce kathleen livia lívia lorena luiza marcela milena miriam nathalia nathália pamela pâmela raquel renata silvia sílvia tais taís tania tânia vera wanessa".split(" "));
const MASC = new Set("joao joão pedro carlos paulo marcos lucas rafael thiago rodrigo felipe eduardo gustavo sergio sérgio daniel bruno fernando andre andré leandro marcelo roberto fabio fábio william diego mateus matheus alan alex anderson antonio antônio caio cesar césar christian claudio cláudio davi denis emerson erick eric evandro francisco gabriel geraldo gilberto igor ivan jorge jose josé julio júlio leonardo luiz luis manuel marcio márcio mario mário nelson nilton oscar pablo patrick renan renato ricardo ronaldo ruan samuel tiago vinicius vinícius wagner wellinton wellington wilson yuri".split(" "));

export function genero(l: Lead): Genero {
  const t = (l.tags || []).join(" ").toLowerCase();
  if (t.includes("feminino") || t.includes("dra") || t.includes("mulher")) return "feminino";
  if (t.includes("masculino") || t.includes("dr.") || t.includes("homem")) return "masculino";
  const first = (l.name || "").trim().split(" ")[0].toLowerCase();
  if (FEM.has(first)) return "feminino";
  if (MASC.has(first)) return "masculino";
  return "neutro";
}

export const RECENCIA_LABEL: Record<Recencia, string> = { quente: "Quente", morno: "Morno", frio: "Frio" };
export const PERFIL_LABEL: Record<Perfil, string> = { gestor: "Gestor", autonomo: "Autônomo" };

const CONTEXTO: Record<Recencia, string> = {
  quente: "Notei que você adquiriu recentemente o kit de precificação do Thiago Alemão",
  morno: "Você adquiriu o kit de precificação do Thiago Alemão há alguns meses",
  frio: "Há algum tempo você adquiriu o kit de precificação do Thiago Alemão",
};

export const SCRIPT_DEFAULTS: Record<Perfil, string> = {
  gestor: `Olá, {saudacao}!

Me chamo Wendell e faço parte da equipe do Thiago Alemão. {contexto} e isso nos mostra que a gestão financeira da sua clínica é uma prioridade para você.

Gostaríamos de entender melhor como está sendo sua jornada à frente da clínica e apresentar algumas soluções que o Thiago tem desenvolvido especificamente para gestores que buscam crescimento com mais estratégia e menos sobrecarga.

Teria alguns minutinhos para conversarmos esta semana?`,
  autonomo: `Olá, {saudacao}!

Me chamo Wendell e faço parte da equipe do Thiago Alemão. {contexto} e isso nos mostra que você já está buscando caminhos para valorizar mais o seu trabalho como veterinário(a) autônomo(a).

Gostaríamos de te apresentar algo que pode complementar o que você já tem em mãos e te ajudar a estruturar ainda mais sua precificação e gestão financeira na prática.

Teria alguns minutinhos para conversarmos esta semana?`,
};

/** Mensagem individual (fallback quando o lead não tem perfil gestor/autônomo). */
export function scriptIndividual(l: Lead, funnels: Funnel[]) {
  const perfil = leadPerfil(l, funnels);
  const g = genero(l);
  const first = (l.name || "Lead").split(" ")[0];
  const saud = g === "feminino" ? `Olá, Dra. ${first}!` : g === "masculino" ? `Olá, Dr. ${first}!` : `Olá, ${first}!`;
  const ctx = CONTEXTO[recencia(l.date)];
  if (perfil === "gestor") {
    const alvo = g === "feminino" ? "gestoras" : g === "masculino" ? "gestores" : "gestores veterinários";
    return `${saud}\n\nMe chamo Wendell e faço parte da equipe do Thiago Alemão. ${ctx} e isso nos mostra que a gestão financeira da sua clínica é uma prioridade — o que é essencial para quem lidera um negócio.\n\nGostaríamos de entender melhor como está sendo sua jornada à frente da clínica e apresentar algumas soluções que o Thiago tem desenvolvido especificamente para ${alvo} que buscam crescimento com mais estratégia e menos sobrecarga.\n\nTeria alguns minutinhos para conversarmos esta semana?`;
  }
  if (perfil === "autonomo") {
    const quem = g === "feminino" ? "uma veterinária autônoma" : g === "masculino" ? "um veterinário autônomo" : "quem atua como veterinário(a) autônomo(a)";
    return `${saud}\n\nMe chamo Wendell e faço parte da equipe do Thiago Alemão. ${ctx} e isso nos mostra que você já está buscando caminhos para valorizar mais o seu trabalho — o que é muito importante para ${quem}.\n\nGostaríamos de te apresentar algo que pode complementar muito bem o que você já tem em mãos e te ajudar a estruturar ainda mais a sua precificação e gestão financeira na prática.\n\nTeria alguns minutinhos para conversarmos esta semana?`;
  }
  return `${saud}\n\nMe chamo Wendell e faço parte da equipe do Thiago Alemão. ${ctx} e isso nos mostra que a gestão financeira é uma área de interesse para você.\n\nGostaríamos de entender melhor o seu momento atual e apresentar algumas soluções que podem fazer sentido para a sua realidade profissional.\n\nTeria alguns minutinhos para conversarmos esta semana?`;
}

export function applyScript(l: Lead, funnels: Funnel[], scripts: Record<Perfil, string>) {
  const perfil = leadPerfil(l, funnels);
  if (!perfil) return scriptIndividual(l, funnels);
  const first = (l.name || "Lead").split(" ")[0];
  const g = genero(l);
  const saud = g === "feminino" ? `Dra. ${first}` : g === "masculino" ? `Dr. ${first}` : first;
  return (scripts[perfil] || SCRIPT_DEFAULTS[perfil])
    .replace(/\{nome\}/gi, first)
    .replace(/\{saudacao\}/gi, saud)
    .replace(/\{contexto\}/gi, CONTEXTO[recencia(l.date)])
    .replace(/\{perfil\}/gi, perfil === "gestor" ? "Gestor Veterinário" : "Veterinário Autônomo");
}

/** CORREÇÃO: o antigo usava o número cru; sem o 55 o link do wa.me abria o contato errado. */
export function waLink(phone: string, text: string) {
  const num = normalizePhone(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export const isPlanilhaComFone = (l: Lead) => (l.tags || []).includes(TAG_PLANILHA) && digits(l.phone).length >= 11;
export const isAbordado = (l: Lead) => (l.tags || []).includes(TAG_ABORDADO);

/* ───────────────── Mentorias ───────────────── */

/** CORREÇÃO: término = início + N meses (o antigo às vezes somava N semanas). */
export function mentorshipEnd(start: string, months: number) {
  if (!start || !months) return "";
  const d = new Date(start + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return today(d);
}

export function generateSessions(m: Pick<Mentorship, "startDate" | "endDate" | "totalWeeks" | "scheduleType" | "scheduleDayOfWeek" | "scheduleDayOfMonth" | "scheduleIntervalDays">) {
  if (!m.startDate || m.scheduleType === "nenhuma") return [];
  const start = new Date(m.startDate + "T00:00:00");
  const end = m.endDate ? new Date(m.endDate + "T00:00:00") : new Date(mentorshipEnd(m.startDate, m.totalWeeks || 3) + "T00:00:00");
  const out: string[] = [];
  const max = 200;
  let cur = new Date(start);
  if (m.scheduleType === "semanal" || m.scheduleType === "quinzenal") {
    const days = Array.isArray(m.scheduleDayOfWeek) ? m.scheduleDayOfWeek : [m.scheduleDayOfWeek].filter((x): x is number => x != null);
    if (!days.length) return [];
    while (cur <= end && out.length < max) {
      if (days.includes(cur.getDay())) {
        out.push(today(cur));
        cur = new Date(cur.getTime() + (m.scheduleType === "quinzenal" ? 14 : 1) * 86400000);
      } else cur = new Date(cur.getTime() + 86400000);
    }
  } else if (m.scheduleType === "mensal_dia") {
    const day = m.scheduleDayOfMonth || 1;
    cur = new Date(start.getFullYear(), start.getMonth(), day);
    if (cur < start) cur.setMonth(cur.getMonth() + 1);
    while (cur <= end && out.length < max) {
      out.push(today(cur));
      cur.setMonth(cur.getMonth() + 1);
      cur.setDate(day);
    }
  } else if (m.scheduleType === "intervalo") {
    const step = m.scheduleIntervalDays || 15;
    while (cur <= end && out.length < max) {
      out.push(today(cur));
      cur = new Date(cur.getTime() + step * 86400000);
    }
  }
  return out;
}

export const monthHours = (m: Mentorship) => (Number(m.hoursPerSession) || 0) * (Number(m.sessionsPerWeek) || 0);

export function projection(ms: Mentorship[], months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const act = ms.filter((m) => {
      if (!m.active && !m.endDate) return false;
      const s = m.startDate ? new Date(m.startDate + "T00:00:00") : null;
      const e = m.endDate ? new Date(m.endDate + "T00:00:00") : null;
      if (!s && m.active) return true;
      if (s && s > mEnd) return false;
      if (e && e < mStart) return false;
      return true;
    });
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      short: MONTHS[d.getMonth()],
      revenue: act.reduce((s, m) => s + (Number(m.value) || 0), 0),
      clients: act.map((m) => m.client),
      isCurrent: i === 0,
    };
  });
}

/** Funis que não entram na visão operacional (planilha, gestores, autônomos). */
export const isOperationalFunnel = (f: Funnel) => {
  const n = f.name.toLowerCase();
  return !n.includes("planilha") && !n.includes("gestor") && !n.includes("autôn") && !n.includes("auton");
};
