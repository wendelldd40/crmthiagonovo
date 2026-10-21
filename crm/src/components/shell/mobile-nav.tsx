"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as D from "@radix-ui/react-dialog";
import { useState } from "react";
import { ClipboardList, Kanban, LayoutDashboard, LogOut, Menu as MenuIcon, Plus, Search, Users, X } from "lucide-react";
import { useCRM } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { OwlMark, Wordmark } from "./logo";
import { ThemeToggle } from "./theme";

const BOTTOM = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard, key: "painel" },
  { href: "/kanban", label: "Kanban", icon: Kanban, key: "kanban" },
  null,
  { href: "/leads", label: "Leads", icon: Users, key: "leads" },
  { href: "/estagiario", label: "Tarefas", icon: ClipboardList, key: "estagiario" },
] as const;

export function MobileTop({ onSearch }: { onSearch: () => void }) {
  const path = usePathname();
  const { can, signOut, user } = useCRM();
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-navy px-3 text-navy-ink md:hidden">
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Trigger className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Abrir menu">
          <MenuIcon className="size-5" />
        </D.Trigger>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-[fade-in_150ms]" />
          <D.Content className="fixed inset-y-0 left-0 z-[61] flex w-[82vw] max-w-[300px] flex-col bg-navy p-3 text-navy-ink data-[state=open]:animate-[fade-in_150ms]">
            <D.Title className="sr-only">Menu</D.Title>
            <D.Description className="sr-only">Navegação principal</D.Description>
            <div className="mb-3 flex items-center gap-2.5 px-1">
              <OwlMark className="size-8" />
              <Wordmark className="flex-1 text-white" />
              <D.Close className="grid size-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Fechar menu">
                <X className="size-4" />
              </D.Close>
            </div>
            <nav className="scroll-navy flex-1 overflow-y-auto">
              {NAV.filter((n) => can(n.key)).map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px]", path.startsWith(n.href) ? "bg-white/10 text-white" : "text-navy-ink-2")}>
                  <n.icon className="size-[18px]" /> {n.label}
                </Link>
              ))}
            </nav>
            {user && (
              <button onClick={() => void signOut()} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-navy-ink-2 hover:bg-white/10">
                <LogOut className="size-[18px]" /> Sair ({user.name})
              </button>
            )}
          </D.Content>
        </D.Portal>
      </D.Root>
      <OwlMark className="size-7 rounded-lg" />
      <Wordmark className="flex-1 text-[15px] text-white" />
      <button onClick={onSearch} className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Buscar lead">
        <Search className="size-[18px]" />
      </button>
      <ThemeToggle className="size-9" />
    </div>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { can, setDialog, canEdit } = useCRM();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-5 items-center">
        {BOTTOM.map((b, i) =>
          b === null ? (
            <div key={i} className="grid place-items-center">
              {canEdit && (
                <button onClick={() => setDialog({ kind: "lead" })} className="-mt-6 grid size-13 place-items-center rounded-2xl bg-brand text-brand-ink shadow-pop" aria-label="Novo lead">
                  <Plus className="size-6" />
                </button>
              )}
            </div>
          ) : can(b.key) ? (
            <Link key={b.href} href={b.href} className={cn("flex flex-col items-center gap-0.5 text-[11px] font-semibold", path.startsWith(b.href) ? "text-brand" : "text-ink-3")}>
              <b.icon className="size-5" />
              {b.label}
            </Link>
          ) : (
            <span key={b.href} />
          ),
        )}
      </div>
    </nav>
  );
}
