"use client";
import { Cable, Pencil, Trash2 } from "lucide-react";
import { useCRM } from "@/lib/store";
import { findFunnel, findStage } from "@/lib/domain";
import { TAG_ELO } from "@/lib/config";
import type { Lead } from "@/lib/types";
import { cn, fmtDate, fmtMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/chip";
import { Tip } from "@/components/ui/tooltip";
import { ConvertedChip, Hl, OriginChip, VetChip } from "./bits";
import { EsteiraSelo } from "./esteira";

export function LeadTable({ leads, q = "", actions = true, selectable, selected, onToggle, onToggleAll }: {
  leads: Lead[];
  q?: string;
  actions?: boolean;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const { funnels, openLead, setDialog, confirm, deleteLead, canEdit } = useCRM();
  const allOn = !!selected && leads.length > 0 && leads.every((l) => selected.has(l.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-[12px] text-ink-3">
            {selectable && (
              <th className="w-10 py-2.5 pl-5">
                <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={allOn} onChange={onToggleAll} aria-label="Selecionar todos" />
              </th>
            )}
            <th className={cn("py-2.5 font-semibold", !selectable && "pl-5")}>Lead</th>
            <th className="py-2.5 font-semibold">Funil e etapa</th>
            <th className="py-2.5 font-semibold">Origem</th>
            <th className="py-2.5 text-right font-semibold">Valor</th>
            <th className="py-2.5 pl-4 font-semibold">Perfil</th>
            <th className="py-2.5 font-semibold">Entrada</th>
            {actions && canEdit && <th className="w-24 py-2.5 pr-5" />}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const f = findFunnel(funnels, l.funnelId);
            const s = findStage(f, l.stageId);
            const on = selected?.has(l.id);
            return (
              <tr key={l.id} onClick={() => openLead(l.id)} className={cn("group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2", on && "bg-brand-soft/50 hover:bg-brand-soft/70")}>
                {selectable && (
                  <td className="py-2.5 pl-5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!on} onChange={() => onToggle?.(l.id)} aria-label={`Selecionar ${l.name}`} />
                  </td>
                )}
                <td className={cn("py-2.5 pr-3", !selectable && "pl-5")}>
                  <div className="flex items-center gap-3">
                    <Avatar name={l.name} size={34} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                        <Hl text={l.name} q={q} />
                        {l.tags.includes(TAG_ELO) && <Cable className="size-3.5 shrink-0 text-brand" aria-label="No Elo" />}
                      </p>
                      <p className="max-w-[240px] truncate text-[12.5px] text-ink-3">
                        <Hl text={[l.company, l.instagram || l.email || l.phone].filter(Boolean).join("  ·  ") || "—"} q={q} />
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <p className="truncate text-[12.5px] text-ink-3">{f?.name ?? "—"}</p>
                  <p className="flex items-center gap-1.5 font-medium text-ink">{s && <Dot color={s.color} />}{s?.name ?? "—"}</p>
                </td>
                <td className="py-2.5 pr-3"><OriginChip value={l.origin} short /></td>
                <td className="tabular py-2.5 text-right font-semibold text-ink">{fmtMoney(l.value)}</td>
                <td className="py-2.5 pl-4">
                  <div className="flex items-center gap-1"><VetChip lead={l} compact /><ConvertedChip lead={l} /><EsteiraSelo lead={l} /></div>
                </td>
                <td className="tabular py-2.5 text-ink-3">{fmtDate(l.date)}</td>
                {actions && canEdit && (
                  <td className="py-2.5 pr-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                      <Tip label="Editar"><Button size="icon-xs" variant="ghost" onClick={() => setDialog({ kind: "lead", leadId: l.id })} aria-label="Editar"><Pencil /></Button></Tip>
                      <Tip label="Excluir">
                        <Button size="icon-xs" variant="danger-ghost" aria-label="Excluir" onClick={() => confirm("Excluir lead", `“${l.name}” e todo o histórico serão apagados. Não dá para desfazer.`, "Excluir lead", () => deleteLead(l.id))}>
                          <Trash2 />
                        </Button>
                      </Tip>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
