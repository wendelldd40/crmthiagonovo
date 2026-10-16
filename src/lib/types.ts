/* Entidades do ThiagoCRM — espelham as tabelas que já existem no Supabase.
   Nenhuma coluna nova: o CRM novo grava exatamente onde o antigo gravava. */

export type Role = "admin" | "dev" | "estagiario" | "marketing";

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export interface Funnel {
  id: string;
  name: string;
  icon: string;
  color: string;
  stages: Stage[];
}

export interface Activity {
  text: string;
  time: string;
}

export type OriginKey =
  | "ig_comentario"
  | "ig_seguidor"
  | "whatsapp"
  | "indicacao"
  | "organico"
  | "evento"
  | "site"
  | "email"
  | "linkedin"
  | "outro";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  company: string;
  origin: OriginKey | string;
  isVet: boolean;
  funnelId: string | null;
  stageId: string | null;
  value: number;
  tags: string[];
  notes: string;
  followUp: string;
  converted: boolean;
  convertedDate: string;
  serviceMonths: number;
  activities: Activity[];
  date: string;
  /** Esteira de contatos calculada pelo Elo (somente leitura no CRM). */
  elo: EloEsteira | null;
}

export interface EloEsteira {
  contatos: number;
  total: number | null;
  cadencia: string | null;
  ultimoContato: string | null;
  ultimoTipo: string | null;
  respostas: number;
  ultimaResposta: string | null;
  status: "ativa" | "pausada" | "concluida" | "sem" | null;
}

export type Priority = "urgente" | "alta" | "media" | "baixa";
export type TaskStatus = "pendente" | "em_andamento" | "concluida";

export interface Task {
  id: string;
  title: string;
  desc: string;
  priority: Priority;
  status: TaskStatus;
  deadline: string;
  createdAt: string;
}

export type ScheduleType = "nenhuma" | "semanal" | "quinzenal" | "mensal_dia" | "intervalo";

export interface Mentorship {
  id: string;
  client: string;
  type: string;
  hoursPerSession: number;
  /** Historicamente chamado "por semana" no banco, mas significa sessões por MÊS. */
  sessionsPerWeek: number;
  /** Historicamente "semanas" no banco; significa total de MESES. */
  totalWeeks: number;
  startDate: string;
  endDate: string;
  active: boolean;
  value: number;
  notes: string;
  scheduleType: ScheduleType;
  scheduleDayOfWeek: number[] | number | null;
  scheduleDayOfMonth: number | null;
  scheduleIntervalDays: number | null;
  scheduleSessions: string[];
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
  created_at?: string;
}

export interface Snapshot {
  funnels: Funnel[];
  leads: Lead[];
  tasks: Task[];
  mentorships: Mentorship[];
  settings: Record<string, string>;
}
