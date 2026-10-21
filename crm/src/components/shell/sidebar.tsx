"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogOut, Plus, Search } from "lucide-react";
import { useCRM } from "@/lib/store";
import { ROLE_COLOR, ROLE_LABEL } from "@/lib/constants";
import { IS_DEMO } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { NAV } from "./nav";
import { OwlMark, Wordmark } from "./logo";
import { ThemeToggle } from "./theme";

export function useBadges() {
  const { leads, tasks } = useCRM();
  return {
    kanban: leads.length,
    leads: leads.length,
    estagiario: tasks.filter((t) => t.status !== "concluida").length,
  } as Record<string, number>;
}

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const { can, user, signOut, funnels, leads, activeFunnelId, setActiveFunnelId, setDialog, canEdit } = useCRM();
  const badges = useBadges();
  const groups = [
    { id: "pipeline", label: "Pipeline" },
    { id: "equipe", label: "Equipe" },
  ] as const;

  return (
    <aside className="scroll-navy hidden w-[248px] shrink-0 flex-col overflow-y-auto bg-navy text-navy-ink md:flex">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <OwlMark />
        <div className="min-w-0 flex-1 leading-tight">
          <Wordmark className="block text-white" />
          <span className="block truncate text-[11px] text-navy-ink-2">Gestão Empresarial Veterinária</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="space-y-2 px-3 pb-2">
        <button onClick={onSearch} className="flex h-9 w-full items-center gap-2 rounded-[10px] bg-white/[0.06] px-3 text-[13px] text-navy-ink-2 ring-1 ring-white/[0.06] transition-colors hover:bg-white/10 hover:text-navy-ink">
          <Search className="size-4" />
          <span className="flex-1 text-left">Buscar lead</span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold">Ctrl K</kbd>
        </button>
        {canEdit && (
          <button onClick={() => setDialog({ kind: "lead" })} className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-[#2d9d8f] text-[13px] font-semibold text-white shadow-[0_6px_18px_-8px_#2d9d8f] transition-colors hover:bg-[#35b8a8]">
            <Plus className="size-4" /> Novo lead
          </button>
        )}
      </div>

      <nav className="px-3 pt-2">
        {groups.map((g) => {
          const items = NAV.filter((n) => n.group === g.id && can(n.key));
          if (!items.length) return null;
          return (
            <div key={g.id} className="mb-3">
              <p className="px-2.5 pb-1.5 pt-2 text-[11.5px] font-semibold text-navy-ink-2/80">{g.label}</p>
              {items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                const n = badges[item.key];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] font-medium transition-colors",
                      active ? "text-white" : "text-navy-ink-2 hover:bg-white/[0.05] hover:text-navy-ink",
                    )}
                  >
                    {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-[10px] bg-white/[0.09] ring-1 ring-white/[0.08]" transition={{ type: "spring", bounce: 0.15, duration: 0.35 }} />}
                    {active && <motion.span layoutId="nav-bar" className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-[#3fc3b2]" transition={{ type: "spring", bounce: 0.15, duration: 0.35 }} />}
                    <item.icon className={cn("relative size-[17px] shrink-0", active && "text-[#5fd6c6]")} />
                    <span className="relative flex-1 truncate">{item.label}</span>
                    {!!n && (
                      <span className={cn("tabular relative rounded-full px-1.5 text-[11px] font-semibold leading-5", item.key === "estagiario" ? "bg-[#a855f7]/25 text-[#d8b8ff]" : "text-navy-ink-2/80")}>{n}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {can("kanban") && funnels.length > 0 && (
        <div className="px-3 pb-3">
          <p className="flex items-center px-2.5 pb-1.5 pt-1 text-[11.5px] font-semibold text-navy-ink-2/80">
            <span className="flex-1">Funis de venda</span>
            {canEdit && (
              <button onClick={() => setDialog({ kind: "funnel" })} className="grid size-5 place-items-center rounded-md hover:bg-white/10 hover:text-white" aria-label="Novo funil" title="Novo funil">
                <Plus className="size-3.5" />
              </button>
            )}
          </p>
          {funnels.map((f) => {
            const n = leads.filter((l) => l.funnelId === f.id).length;
            const active = f.id === activeFunnelId && path === "/kanban";
            return (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFunnelId(f.id);
                  router.push("/kanban");
                }}
                className={cn("flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors", active ? "bg-white/[0.07] text-white" : "text-navy-ink-2 hover:bg-white/[0.05] hover:text-navy-ink")}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: f.color, boxShadow: `0 0 0 3px color-mix(in oklab, ${f.color} 25%, transparent)` }} />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="tabular text-[11px] text-navy-ink-2/70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto border-t border-white/[0.06] p-3">
        {IS_DEMO && <p className="mb-2 rounded-lg bg-[#f0b44e]/12 px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-[#f6cf8a]">Modo demonstração: dados fictícios salvos só neste navegador.</p>}
        {user && (
          <Menu>
            <MenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/[0.06]">
                <span className="grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${ROLE_COLOR[user.role]}, color-mix(in oklab, ${ROLE_COLOR[user.role]} 55%, #051528))` }}>
                  {user.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">{user.name}</span>
                  <span className="block text-[11px]" style={{ color: ROLE_COLOR[user.role] }}>{ROLE_LABEL[user.role]}</span>
                </span>
              </button>
            </MenuTrigger>
            <MenuContent side="top" align="start" className="w-56">
              <MenuLabel>{user.email}</MenuLabel>
              <MenuSeparator />
              <MenuItem onSelect={() => void signOut()}>
                <LogOut /> Sair
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>
    </aside>
  );
}
