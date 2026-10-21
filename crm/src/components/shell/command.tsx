"use client";
import * as D from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { useCRM } from "@/lib/store";
import { origin } from "@/lib/constants";
import { findFunnel, findStage } from "@/lib/domain";
import { cn, matches, normalize } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { NAV } from "./nav";

/** Busca global (Ctrl/Cmd + K): leads e telas. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { leads, funnels, openLead, can } = useCRM();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);


  const items = useMemo(() => {
    const pages = NAV.filter((n) => can(n.key) && (!q || normalize(n.label).includes(normalize(q)))).map((n) => ({ type: "page" as const, id: n.href, n }));
    const ls = q.trim()
      ? leads.filter((l) => matches(l, q)).slice(0, 8)
      : [...leads].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return [...ls.map((l) => ({ type: "lead" as const, id: l.id, l })), ...pages.slice(0, q ? 4 : 0)];
  }, [q, leads, can]);

  function run(i: number) {
    const it = items[i];
    if (!it) return;
    setQ("");
    setSel(0);
    onOpenChange(false);
    if (it.type === "lead") openLead(it.l.id);
    else router.push(it.n.href);
  }

  return (
    <D.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setQ("");
          setSel(0);
        }
        onOpenChange(v);
      }}
    >
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-[#051528]/45 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_140ms]" />
        <D.Content className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none data-[state=open]:animate-[fade-in_140ms]">
          <D.Title className="sr-only">Buscar</D.Title>
          <D.Description className="sr-only">Busque leads por nome, e-mail, Instagram, empresa ou telefone</D.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-[18px] text-ink-3" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(s + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(s - 1, 0));
                } else if (e.key === "Enter") run(sel);
              }}
              placeholder="Nome, @instagram, clínica ou telefone"
              className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
            <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold text-ink-3">Esc</kbd>
          </div>
          <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
            {!q && <p className="px-2.5 pb-1 pt-1 text-xs font-semibold text-ink-3">Entraram por último</p>}
            {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-3">Nenhum lead encontrado para “{q}”.</p>}
            {items.map((it, i) => (
              <button
                key={it.type + it.id}
                onMouseMove={() => setSel(i)}
                onClick={() => run(i)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left", sel === i && "bg-sunken")}
              >
                {it.type === "lead" ? (
                  <>
                    <Avatar name={it.l.name} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{it.l.name}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {[findStage(findFunnel(funnels, it.l.funnelId), it.l.stageId)?.name, it.l.instagram || it.l.company || it.l.phone, origin(it.l.origin).short].filter(Boolean).join("  ·  ")}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="grid size-8 place-items-center rounded-lg bg-sunken text-ink-2">
                      <it.n.icon className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-ink">Ir para {it.n.label}</span>
                  </>
                )}
                {sel === i && <CornerDownLeft className="size-4 text-ink-3" />}
              </button>
            ))}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
