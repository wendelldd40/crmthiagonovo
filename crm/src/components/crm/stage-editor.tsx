"use client";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { STAGE_COLORS } from "@/lib/constants";
import type { Stage } from "@/lib/types";
import { uid } from "@/lib/utils";

function StageRow({ s, onChange, onRemove, count }: { s: Stage; onChange: (s: Stage) => void; onRemove: () => void; count?: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pr-2 ${isDragging ? "relative z-10 shadow-pop" : "shadow-soft"}`}
    >
      <button type="button" className="grid size-8 cursor-grab place-items-center rounded-lg text-ink-3 hover:bg-sunken active:cursor-grabbing" aria-label="Arrastar para reordenar" {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: s.color }} title="Cor da etapa">
        <input type="color" value={s.color} onChange={(e) => onChange({ ...s, color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <input
        value={s.name}
        onChange={(e) => onChange({ ...s, name: e.target.value })}
        placeholder="Nome da etapa"
        className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm font-medium text-ink outline-none focus:bg-surface-2"
      />
      {count != null && count > 0 && <span className="tabular text-xs text-ink-3" title="Leads nesta etapa">{count}</span>}
      <button type="button" onClick={onRemove} className="grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-coral-soft hover:text-coral" aria-label="Remover etapa">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function StageEditor({ stages, onChange, counts }: { stages: Stage[]; onChange: (s: Stage[]) => void; counts?: Record<string, number> }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function end(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = stages.findIndex((s) => s.id === e.active.id);
    const to = stages.findIndex((s) => s.id === e.over!.id);
    onChange(arrayMove(stages, from, to));
  }
  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {stages.map((s) => (
            <StageRow
              key={s.id}
              s={s}
              count={counts?.[s.id]}
              onChange={(n) => onChange(stages.map((x) => (x.id === s.id ? n : x)))}
              onRemove={() => stages.length > 1 && onChange(stages.filter((x) => x.id !== s.id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={() => onChange([...stages, { id: uid(), name: "", color: STAGE_COLORS[stages.length % STAGE_COLORS.length] }])}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[13px] font-semibold text-ink-3 transition-colors hover:border-brand hover:text-brand"
      >
        <Plus className="size-4" /> Adicionar etapa
      </button>
      {counts && <p className="text-xs text-ink-3">Leads de uma etapa removida voltam para a primeira etapa.</p>}
    </div>
  );
}

export function cleanStages(stages: Stage[]) {
  return stages.map((s, i) => ({ ...s, name: s.name.trim() || `Etapa ${i + 1}` }));
}
