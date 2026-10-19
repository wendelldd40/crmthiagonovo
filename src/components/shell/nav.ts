import { Cable, ChartColumn, FileUp, ClipboardList, Funnel, GraduationCap, Kanban, LayoutDashboard, Megaphone, MessageCircleMore, UserCog, Users, type LucideIcon } from "lucide-react";
import type { PageKey } from "@/lib/constants";

export interface NavItem {
  key: PageKey;
  href: string;
  label: string;
  icon: LucideIcon;
  group: "pipeline" | "equipe";
}

export const NAV: NavItem[] = [
  { key: "painel", href: "/painel", label: "Painel", icon: LayoutDashboard, group: "pipeline" },
  { key: "kanban", href: "/kanban", label: "Kanban", icon: Kanban, group: "pipeline" },
  { key: "leads", href: "/leads", label: "Leads", icon: Users, group: "pipeline" },
  { key: "importar", href: "/importar", label: "Importar leads", icon: FileUp, group: "pipeline" },
  { key: "funis", href: "/funis", label: "Funis", icon: Funnel, group: "pipeline" },
  { key: "relatorios", href: "/relatorios", label: "Relatórios", icon: ChartColumn, group: "pipeline" },
  { key: "abordagem", href: "/abordagem", label: "Abordagem", icon: MessageCircleMore, group: "equipe" },
  { key: "estagiario", href: "/estagiario", label: "Estagiário", icon: ClipboardList, group: "equipe" },
  { key: "thiago", href: "/thiago", label: "Thiago pessoal", icon: GraduationCap, group: "equipe" },
  { key: "marketing", href: "/marketing", label: "Marketing", icon: Megaphone, group: "equipe" },
  { key: "elo", href: "/elo", label: "Integração Elo", icon: Cable, group: "equipe" },
  { key: "usuarios", href: "/usuarios", label: "Usuários", icon: UserCog, group: "equipe" },
];
