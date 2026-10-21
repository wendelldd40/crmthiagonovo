"use client";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { AlarmClock, CalendarClock, Plus, Settings2 } from "lucide-react";
import { useCRM } from "@/lib/store";
import { followStatus } from "@/lib/domain";
import type { Funnel, Lead, Stage } from "@/lib/types";
import { cn, fmtDate, fmtMoney, fmtMoneyCompact, matches } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConvertedChip, Hl, OriginChip, VetChip } from "@/components/crm/bits";
import { EsteiraSelo } from "@/components/crm/esteira";

const collision: CollisionDetection = (args) => {
  const p = pointerWithin(args);
  return p.length ? p : rectIntersection(args);
};

function CardBody({ l, q, dragging }: { l: Lead; q: string; dragging?: boolean }) {
  const fs = followStatus(l);
  const alert = !l.converted && (fs === "overdue" || fs === "today") ? fs : null;
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-3 shadow-soft transition-shadow", dragging ? "rotate-[1.5deg] shadow-pop ring-2 ring-brand/50" : "group-hover:border-line-strong group-hover:shadow-card")}>
      <div className="flex items-start gap-2.5">
        <Avatar name={l.name} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold leading-tight text-ink"><Hl text={l.name} q={q} /></p>
          {(l.instagram || l.company) && (
            <p className={cn("mt-0.5 truncate text-[12px]", l.instagram ? "text-[#d6336c]" : "text-ink-3")}>
              <Hl text={l.instagram || l.company} q={q} />
            </p>
          )}
        </div>
        {alert && (
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", alert === "overdue" ? "bg-coral-soft text-coral" : "bg-amber-soft text-amber")} title={alert === "overdue" ? `Contato atrasado desde ${fmtDate(l.followUp)}` : "Contato marcado para hoje"}>
            {alert === "overdue" ? <AlarmClock className="size-3.5" /> : <CalendarClock className="size-3.5" />}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <OriginChip value={l.origin} short />
        <VetChip lead={l} compact />
        <ConvertedChip lead={l} />
        <EsteiraSelo lead={l} />
        {l.tags.filter((t) => !["planilha", "elo"].includes(t)).slice(0, 2).map((t) => <Chip key={t} color="var(--brand)">{t}</Chip>)}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[12px]">
        <span className="tabular text-ink-3">{fmtDate(l.date)}</span>
        {l.value > 0 && <span className="tabular font-semibold text-ink">{fmtMoney(l.value)}</span>}
      </div>
    </div>
  );
}

function DraggableCard({ l, q, disabled }: { l: Lead; q: string; disabled: boolean }) {
  const { openLead } = useCRM();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: l.id, data: { stageId: l.stageId }, disabled });
  return (
    <motion.div layout="position" layoutId={`k-${l.id}`} transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={() => openLead(l.id)}
        className={cn("group cursor-pointer touch-manipulation outline-none", isDragging && "opacity-30")}
        role="button"
        aria-label={`${l.name}. Clique para abrir, arraste para mudar de etapa.`}
      >
        <CardBody l={l} q={q} />
      </div>
    </motion.div>
  );
}

function Column({ f, s, leads, total, q }: { f: Funnel; s: Stage; leads: Lead[]; total: number; q: string }) {
  const { setDialog, canEdit } = useCRM();
  const { setNodeRef, isOver } = useDroppable({ id: s.id });
  const sum = leads.reduce((acc, l) => acc + (l.value || 0), 0);
  return (
    <section className={cn("flex w-[288px] shrink-0 flex-col rounded-2xl bg-sunken/70 transition-colors", isOver && "bg-brand-soft ring-2 ring-brand/40")}>
      <header className="px-3.5 pb-2 pt-3">
        <div className="mb-2 h-1 rounded-full" style={{ background: s.color }} />
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{s.name}</h2>
          <span className={cn("tabular rounded-md px-1.5 text-[12px] font-semibold leading-5", q ? "bg-amber-soft text-amber" : "text-ink-3")}>{q ? `${leads.length}/${total}` : leads.length}</span>
        </div>
        {sum > 0 && <p className="tabular mt-0.5 text-[12px] text-ink-3">{fmtMoneyCompact(sum)} em pipeline</p>}
      </header>
      <div ref={setNodeRef} className="scroll-thin flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
        {leads.map((l) => <DraggableCard key={l.id} l={l} q={q} disabled={!canEdit} />)}
        {!leads.length && <p className="py-8 text-center text-[12.5px] text-ink-3">{q ? "Nenhum resultado aqui" : "Arraste um lead para cá"}</p>}
      </div>
      {canEdit && (
        <button onClick={() => setDialog({ kind: "lead", funnelId: f.id, stageId: s.id })} className="mx-2.5 mb-2.5 flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-ink-3 transition-colors hover:bg-surface hover:text-brand">
          <Plus className="size-4" /> Adicionar lead
        </button>
      )}
    </section>
  );
}

export default function KanbanPage() {
  const { funnels, leads, activeFunnelId, setActiveFunnelId, moveLeadTo, setDialog, canEdit } = useCRM();
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const f = funnels.find((x) => x.id === activeFunnelId) ?? funnels[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = useMemo(() => {
    const map: Record<string, { all: Lead[]; shown: Lead[] }> = {};
    if (!f) return map;
    for (const s of f.stages) map[s.id] = { all: [], shown: [] };
    for (const l of leads) {
      if (l.funnelId !== f.id || !l.stageId || !map[l.stageId]) continue;
      map[l.stageId].all.push(l);
      if (matches(l, q)) map[l.stageId].shown.push(l);
    }
    return map;
  }, [leads, f, q]);

  const dragging = dragId ? leads.find((l) => l.id === dragId) : null;

  function onStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }
  function onEnd(e: DragEndEvent) {
    setDragId(null);
    if (!e.over || !f) return;
    const to = String(e.over.id);
    if (to !== e.active.data.current?.stageId) void moveLeadTo(String(e.active.id), f.id, to);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh">
      <PageHeader title="Kanban" subtitle="Arraste o lead para mudar de etapa. No celular, segure o cartão antes de arrastar.">
        <SearchInput value={q} onChange={setQ} placeholder="Filtrar este funil" className="w-56" />
        {canEdit && f && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "stages", funnelId: f.id })}><Settings2 /> Etapas</Button>
            <Button size="sm" onClick={() => setDialog({ kind: "lead", funnelId: f.id })}><Plus /> Lead</Button>
          </>
        )}
      </PageHeader>

      <div className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3 md:px-8">
        {funnels.map((x) => {
          const n = leads.filter((l) => l.funnelId === x.id).length;
          const on = x.id === f?.id;
          return (
            <button
              key={x.id}
              onClick={() => {
                setActiveFunnelId(x.id);
                setQ("");
              }}
              className={cn("relative flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-colors", on ? "text-ink" : "text-ink-3 hover:bg-sunken hover:text-ink-2")}
            >
              {on && <motion.span layoutId="kb-tab" className="absolute inset-0 rounded-xl border border-line bg-surface shadow-soft" transition={{ type: "spring", bounce: 0.15, duration: 0.35 }} />}
              <span className="relative size-2 rounded-full" style={{ background: x.color }} />
              <span className="relative">{x.icon} {x.name}</span>
              <span className="tabular relative text-[12px] font-medium text-ink-3">{n}</span>
            </button>
          );
        })}
      </div>

      {!f ? (
        <Empty title="Nenhum funil ainda" className="flex-1">
          Crie o primeiro funil para começar a organizar os leads.
          {canEdit && <Button className="mt-4" onClick={() => setDialog({ kind: "funnel" })}><Plus /> Criar funil</Button>}
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
          <div className="scroll-thin flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-24 md:px-8 md:pb-6">
            {f.stages.map((s) => (
              <Column key={s.id} f={f} s={s} leads={byStage[s.id]?.shown ?? []} total={byStage[s.id]?.all.length ?? 0} q={q} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.9,.3,1)" }}>
            {dragging ? <div className="w-[264px]"><CardBody l={dragging} q={q} dragging /></div> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
