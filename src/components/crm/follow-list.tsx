"use client";
import { motion, AnimatePresence } from "motion/react";
import { Check, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { useCRM } from "@/lib/store";
import { followUps, type FollowItem } from "@/lib/domain";
import { cn, fmtDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

function reason(f: FollowItem) {
  if (f.kind === "atrasado") return `Próximo contato era ${fmtDate(f.lead.followUp)} · ${f.diffDays} ${f.diffDays === 1 ? "dia" : "dias"} de atraso`;
  if (f.kind === "hoje") return "Próximo contato marcado para hoje";
  return `${f.diffDays} dias sem contato em “${f.stage?.name}” (a regra pede a cada ${f.rule?.days}d)`;
}

export function useFollowUps() {
  const { leads, funnels } = useCRM();
  return useMemo(() => followUps(leads, funnels), [leads, funnels]);
}

export function FollowList({ items, limit }: { items: FollowItem[]; limit?: number }) {
  const { openLead, snoozeFollowUp, markFollowUpDone, canEdit } = useCRM();
  const list = limit ? items.slice(0, limit) : items;
  return (
    <ul className="divide-y divide-line">
      <AnimatePresence initial={false}>
        {list.map((f) => {
          const tone = f.kind === "atrasado" || f.overdue ? "var(--coral)" : f.kind === "hoje" ? "var(--amber)" : (f.rule?.color ?? "var(--ink-3)");
          return (
            <motion.li key={f.lead.id} layout exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }} className="group flex items-center gap-3 px-5 py-3">
              <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: tone }} />
              <button onClick={() => openLead(f.lead.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Avatar name={f.lead.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink group-hover:text-brand">{f.lead.name}</span>
                    <span className="hidden shrink-0 sm:inline-flex">
                      {f.kind === "auto" && f.rule && <Chip color={f.rule.color}>{f.rule.label}</Chip>}
                      {f.kind === "hoje" && <Chip color="var(--amber)">Hoje</Chip>}
                      {f.kind === "atrasado" && <Chip color="var(--coral)">Atrasado</Chip>}
                    </span>
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-3">{reason(f)}</span>
                </span>
              </button>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="xs" variant="ghost" onClick={() => void snoozeFollowUp(f.lead.id, f.snoozeDays)} title={`Adiar ${f.snoozeDays} dia(s)`}>
                    <Clock3 /> <span className="hidden sm:inline">+{f.snoozeDays}d</span>
                  </Button>
                  <Button size="xs" variant="soft" onClick={() => void markFollowUpDone(f.lead.id)}>
                    <Check /> <span className="hidden sm:inline">Feito</span>
                  </Button>
                </div>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function followSummary(items: FollowItem[]) {
  return {
    atrasados: items.filter((f) => f.kind === "atrasado").length,
    hoje: items.filter((f) => f.kind === "hoje").length,
    parados: items.filter((f) => f.kind === "auto").length,
    total: items.length,
  };
}

export const followToneClass = (n: number) => cn(n ? "text-coral" : "text-ok");
