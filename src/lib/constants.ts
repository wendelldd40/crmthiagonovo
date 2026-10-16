import {
  AtSign,
  BriefcaseBusiness,
  Camera,
  Globe,
  Handshake,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  Sprout,
  Tent,
  type LucideIcon,
} from "lucide-react";
import type { Priority, Role, TaskStatus } from "./types";

export interface OriginDef {
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  group: "instagram" | "whatsapp" | "frio" | "outro";
}

export const ORIGINS: Record<string, OriginDef> = {
  ig_comentario: { label: "IG Comentário", short: "Comentário", icon: MessageSquareText, color: "#d6336c", group: "instagram" },
  ig_seguidor: { label: "IG Seguidor/Anúncio", short: "Anúncio IG", icon: Megaphone, color: "#8b5cf6", group: "instagram" },
  whatsapp: { label: "WhatsApp", short: "WhatsApp", icon: MessageCircle, color: "#16a34a", group: "whatsapp" },
  indicacao: { label: "Indicação", short: "Indicação", icon: Handshake, color: "#0891b2", group: "frio" },
  organico: { label: "Orgânico", short: "Orgânico", icon: Sprout, color: "#4d9e3a", group: "frio" },
  evento: { label: "Evento", short: "Evento", icon: Tent, color: "#ea7317", group: "frio" },
  site: { label: "Site", short: "Site", icon: Globe, color: "#2f6fb8", group: "outro" },
  email: { label: "E-mail", short: "E-mail", icon: Mail, color: "#b08a1e", group: "outro" },
  linkedin: { label: "LinkedIn", short: "LinkedIn", icon: BriefcaseBusiness, color: "#0e76a8", group: "outro" },
  outro: { label: "Outro", short: "Outro", icon: AtSign, color: "#7d8a96", group: "outro" },
};

export const ORIGIN_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Instagram", keys: ["ig_comentario", "ig_seguidor"] },
  { label: "WhatsApp", keys: ["whatsapp"] },
  { label: "Indicação e frio", keys: ["indicacao", "organico", "evento"] },
  { label: "Outros", keys: ["site", "email", "linkedin", "outro"] },
];

export function origin(key: string): OriginDef {
  return ORIGINS[key] ?? { label: key || "—", short: key || "—", icon: Camera, color: "#7d8a96", group: "outro" };
}

export const PALETTE = ["#2d9d8f", "#2563eb", "#7c3aed", "#d97706", "#059669", "#e11d48", "#0891b2", "#c4603a", "#4f46e5", "#f97316"];
export const STAGE_COLORS = ["#2563eb", "#7c3aed", "#d97706", "#059669", "#e11d48", "#0891b2", "#c4603a", "#4f46e5", "#2d9d8f", "#f97316"];

export const PRIORITY: Record<Priority, { label: string; color: string; rank: number }> = {
  urgente: { label: "Urgente", color: "var(--coral)", rank: 0 },
  alta: { label: "Alta", color: "#ea7317", rank: 1 },
  media: { label: "Média", color: "var(--amber)", rank: 2 },
  baixa: { label: "Baixa", color: "var(--ok)", rank: 3 },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "var(--ink-3)" },
  em_andamento: { label: "Em andamento", color: "var(--sky)" },
  concluida: { label: "Concluída", color: "var(--ok)" },
};

/* ── Follow-up automático: intervalo máximo sem contato, por etapa (nome) ── */
export const FOLLOWUP_RULES = [
  { match: ["primeiro contato", "first contact"], days: 2, label: "1º contato", color: "#8b5cf6" },
  { match: ["qualificação", "qualificacao", "qualification"], days: 3, label: "Qualificação", color: "#ea7317" },
  { match: ["proposta", "proposal", "proposta enviada"], days: 2, label: "Proposta", color: "#d97706" },
  { match: ["negociação", "negociacao", "negotiation"], days: 1, label: "Negociação", color: "#e11d48" },
  { match: ["lead novo", "new lead", "novo"], days: 5, label: "Lead novo", color: "#2563eb" },
];

/* ── Perfis de acesso (mesmos valores de user_profiles.role) ── */
export type PageKey =
  | "painel"
  | "kanban"
  | "leads"
  | "funis"
  | "relatorios"
  | "estagiario"
  | "thiago"
  | "abordagem"
  | "marketing"
  | "elo"
  | "usuarios";

export const ROLE_PAGES: Record<Role, PageKey[]> = {
  admin: ["painel", "kanban", "leads", "funis", "relatorios", "estagiario", "thiago", "abordagem", "marketing", "elo", "usuarios"],
  dev: ["painel", "kanban", "leads", "funis", "relatorios", "estagiario", "thiago", "abordagem", "marketing", "elo", "usuarios"],
  estagiario: ["painel", "kanban", "leads", "funis", "relatorios", "estagiario", "abordagem", "elo"],
  marketing: ["painel", "leads", "relatorios", "marketing"],
};

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", dev: "Dev", estagiario: "Estagiário", marketing: "Marketing" };
export const ROLE_COLOR: Record<Role, string> = { admin: "#2d9d8f", dev: "#3b82f6", estagiario: "#a855f7", marketing: "#f97316" };
export const ROLE_CAN_EDIT: Record<Role, boolean> = { admin: true, dev: true, estagiario: true, marketing: false };

export const MENTORSHIP_TYPES = ["Mentoria Individual", "Mentoria em Grupo", "Consultoria Avulsa", "Acompanhamento Mensal", "Intensivo"];

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
