"use client";
import { useCallback, useMemo, useState } from "react";
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
import { mesAtual, mesCurto, mesLabel } from "@/lib/meses";
import type { Funnel, Lead, Stage } from "@/lib/types";
import { cn, fmtDate, fmtMoney, fmtMoneyCompact, matches } from "@/lib/utils";
import { SeletorMes, TUDO, useMesesComLead } from "@/components/crm/seletor-mes";
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

function CardBody({ l, q, dragging, mostrarMes }: { l: Lead; q: string; dragging?: boolean; mostrarMes?: boolean }) {
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
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[12px]">
        <span className="tabular text-ink-3">{fmtDate(l.date)}</span>
        <span className="flex items-center gap-2">
          {mostrarMes && l.mesRef && <span className="tabular rounded-md bg-sunken px-1.5 py-0.5 font-medium text-ink-3">{mesCurto(l.mesRef)}</span>}
          {l.value > 0 && <span className="tabular font-semibold text-ink">{fmtMoney(l.value)}</span>}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ l, q, disabled, mostrarMes }: { l: Lead; q: string; disabled: boolean; mostrarMes?: boolean }) {
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
        <CardBody l={l} q={q} mostrarMes={mostrarMes} />
      </div>
    </motion.div>
  );
}

function Column({ f, s, leads, total, q, mostrarMes }: { f: Funnel; s: Stage; leads: Lead[]; total: number; q: string; mostrarMes?: boolean }) {
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
        {leads.map((l) => <DraggableCard key={l.id} l={l} q={q} disabled={!canEdit} mostrarMes={mostrarMes} />)}
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
  const { funnels, leads, activeFunnelId, setActiveFunnelId, moveLeadTo, setDialog, canEdit, puxarPendentes, confirm } = useCRM();
  const [q, setQ] = useState("");
  const [mes, setMes] = useState(mesAtual);
  const [dragId, setDragId] = useState<string | null>(null);
  const f = funnels.find((x) => x.id === activeFunnelId) ?? funnels[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const doFunil = useCallback((l: Lead) => l.funnelId === f?.id, [f?.id]);
  const meses = useMesesComLead(leads, doFunil);

  /** Leads em aberto que ficaram em meses anteriores ao que está sendo visto. */
  const pendentes = useMemo(
    () => (mes === TUDO ? 0 : leads.filter((l) => l.funnelId === f?.id && !l.converted && l.mesRef && l.mesRef < mes).length),
    [leads, f?.id, mes],
  );

  const byStage = useMemo(() => {
    const map: Record<string, { all: Lead[]; shown: Lead[] }> = {};
    if (!f) return map;
    for (const s of f.stages) map[s.id] = { all: [], shown: [] };
    for (const l of leads) {
      if (l.funnelId !== f.id || !l.stageId || !map[l.stageId]) continue;
      if (mes !== TUDO && l.mesRef !== mes) continue;
      map[l.stageId].all.push(l);
      if (matches(l, q)) map[l.stageId].shown.push(l);
    }
    return map;
  }, [leads, f, q, mes]);

  const noMes = useMemo(
    () => Object.values(byStage).reduce((a, g) => a + g.all.length, 0),
    [byStage],
  );

  function trazerPendentes() {
    confirm(
      `Trazer ${pendentes} ${pendentes === 1 ? "lead" : "leads"} para ${mesLabel(mes)}`,
      `${pendentes === 1 ? "Um lead ainda em aberto ficou" : `${pendentes} leads ainda em aberto ficaram`} em meses anteriores. Eles passam a ser trabalhados em ${mesLabel(mes)}, sem perder etapa, histórico nem valor. Leads já convertidos ficam onde estão.`,
      "Trazer para este mês",
      async () => {
        await puxarPendentes(mes, f?.id);
      },
    );
  }

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
      <PageHeader title="Kanban" subtitle="Um quadro por mês. Arraste o lead para mudar de etapa — no celular, segure antes.">
        <SearchInput value={q} onChange={setQ} placeholder="Filtrar este funil" className="w-56" />
        {canEdit && f && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "stages", funnelId: f.id })}><Settings2 /> Etapas</Button>
            <Button size="sm" onClick={() => setDialog({ kind: "lead", funnelId: f.id })}><Plus /> Lead</Button>
          </>
        )}
      </PageHeader>

      <div className="px-4 pb-3 md:px-8">
        <SeletorMes
          mes={mes}
          onChange={setMes}
          meses={meses}
          pendentes={canEdit ? pendentes : 0}
          onPuxar={trazerPendentes}
        />
      </div>

      <div className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3 md:px-8">
        {funnels.map((x) => {
          // a contagem da aba acompanha o mês que está sendo visto
          const n = leads.filter((l) => l.funnelId === x.id && (mes === TUDO || l.mesRef === mes)).length;
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
        <>
        {mes !== TUDO && noMes === 0 && pendentes > 0 && (
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-sunken/70 px-4 py-3 md:mx-8">
            <p className="flex-1 text-[13px] text-ink-2">
              Nenhum lead em {mesLabel(mes)} ainda. Seus leads não sumiram — {pendentes === 1 ? "um continua" : `${pendentes} continuam`} nos meses anteriores.
            </p>
            {canEdit ? (
              <Button size="sm" onClick={trazerPendentes}>Trazer para {mesLabel(mes)}</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setMes(TUDO)}>Ver todos os meses</Button>
            )}
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
          <div className="scroll-thin flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-24 md:px-8 md:pb-6">
            {f.stages.map((s) => (
              <Column key={s.id} f={f} s={s} leads={byStage[s.id]?.shown ?? []} total={byStage[s.id]?.all.length ?? 0} q={q} mostrarMes={mes === TUDO} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.9,.3,1)" }}>
            {dragging ? <div className="w-[264px]"><CardBody l={dragging} q={q} dragging mostrarMes={mes === TUDO} /></div> : null}
          </DragOverlay>
        </DndContext>
        </>
      )}
    </div>
  );
}
