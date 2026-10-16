"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Check, ClipboardList, Loader2, PartyPopper, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useCRM } from "@/lib/store";
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import { SETTING } from "@/lib/config";
import type { Task, TaskStatus } from "@/lib/types";
import { cn, fmtDate, fmtMoney, isOp, plural, today } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Empty } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/segmented";
import { FollowList, useFollowUps } from "@/components/crm/follow-list";

function TaskRow({ t }: { t: Task }) {
  const { setTaskStatus, setDialog, confirm, deleteTask, canEdit } = useCRM();
  const p = PRIORITY[t.priority] ?? PRIORITY.media;
  const late = !!t.deadline && t.deadline < today() && t.status !== "concluida";
  const done = t.status === "concluida";
  const next: TaskStatus = done ? "pendente" : "concluida";
  return (
    <motion.li layout className="group flex gap-3 px-5 py-3.5">
      <button
        disabled={!canEdit}
        onClick={() => void setTaskStatus(t.id, next)}
        className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors", done ? "border-ok bg-ok text-white" : "border-line-strong hover:border-ok")}
        aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[14px] font-semibold", done ? "text-ink-3 line-through" : "text-ink")}>{t.title}</span>
          <Chip color={p.color}>{p.label}</Chip>
          {t.status === "em_andamento" && <Chip color="var(--sky)">Em andamento</Chip>}
        </div>
        {t.desc && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{t.desc}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          {t.deadline && <span className={cn("tabular text-[12px]", late ? "font-semibold text-coral" : "text-ink-3")}>{late ? "Atrasada desde " : "Prazo "}{fmtDate(t.deadline)}</span>}
          {canEdit && !done && (
            <Segmented
              size="sm"
              value={t.status}
              onChange={(v) => void setTaskStatus(t.id, v)}
              options={(["pendente", "em_andamento", "concluida"] as TaskStatus[]).map((s) => ({ value: s, label: TASK_STATUS[s].label }))}
            />
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-0.5 opacity-50 transition-opacity group-hover:opacity-100">
          <Button size="icon-xs" variant="ghost" onClick={() => setDialog({ kind: "task", taskId: t.id })} aria-label="Editar tarefa"><Pencil /></Button>
          <Button size="icon-xs" variant="danger-ghost" onClick={() => confirm("Excluir tarefa", `“${t.title}” será excluída.`, "Excluir tarefa", () => deleteTask(t.id))} aria-label="Excluir tarefa"><Trash2 /></Button>
        </div>
      )}
    </motion.li>
  );
}

export default function EstagiarioPage() {
  const { tasks, leads, settings, setSetting, setDialog, openLead, canEdit, toast } = useCRM();
  const follow = useFollowUps();
  const savedObs = settings[SETTING.estagiarioObs] ?? "";
  const [obs, setObs] = useState(savedObs);
  const [prevSaved, setPrevSaved] = useState(savedObs);
  if (prevSaved !== savedObs) {
    setPrevSaved(savedObs);
    setObs(savedObs);
  }
  const [saving, setSaving] = useState(false);
  const t = today();

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => Number(a.status === "concluida") - Number(b.status === "concluida") || (PRIORITY[a.priority]?.rank ?? 9) - (PRIORITY[b.priority]?.rank ?? 9) || (a.deadline || "9").localeCompare(b.deadline || "9")),
    [tasks],
  );
  const late = tasks.filter((x) => x.deadline && x.deadline < t && x.status !== "concluida").length;
  const op = leads.filter(isOp);
  const converted = op.filter((l) => l.converted);
  const meetings = op.filter((l) => l.followUp && l.followUp >= t && !l.converted).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const count = (s: TaskStatus) => tasks.filter((x) => x.status === s).length;

  async function saveObs() {
    setSaving(true);
    try {
      await setSetting(SETTING.estagiarioObs, obs);
      toast("Recado salvo");
    } catch {}
    setSaving(false);
  }

  return (
    <>
      <PageHeader title="Área do estagiário" subtitle="Tarefas passadas pelo Thiago, follow-ups do dia e recados">
        {canEdit && <Button size="sm" onClick={() => setDialog({ kind: "task" })}><Plus /> Nova tarefa</Button>}
      </PageHeader>
      <PageBody className="space-y-5">
        <Card className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-line">
          {[
            { l: "Pendentes", v: count("pendente"), c: "var(--amber)" },
            { l: "Em andamento", v: count("em_andamento"), c: "var(--sky)" },
            { l: "Concluídas", v: count("concluida"), c: "var(--ok)" },
            { l: "Atrasadas", v: late, c: "var(--coral)" },
          ].map((k) => (
            <div key={k.l} className="px-5 py-4">
              <p className="flex items-center gap-2 text-[13px] text-ink-3"><span className="size-1.5 rounded-full" style={{ background: k.c }} />{k.l}</p>
              <p className="tabular mt-1 font-display text-3xl font-semibold text-ink">{k.v}</p>
            </div>
          ))}
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <Card className="overflow-hidden">
            <CardHead title="Tarefas" subtitle={late ? `${plural(late, "tarefa atrasada", "tarefas atrasadas")}` : "Ordenadas por prioridade e prazo"} />
            {sorted.length ? <ul className="divide-y divide-line border-t border-line">{sorted.map((x) => <TaskRow key={x.id} t={x} />)}</ul> : <Empty icon={ClipboardList} title="Nenhuma tarefa ainda">O Thiago cria tarefas aqui para acompanhar o trabalho.</Empty>}
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <CardHead title="Follow-ups" subtitle={follow.length ? plural(follow.length, "lead para contatar", "leads para contatar") : "Tudo em dia"} />
              {follow.length ? <div className="scroll-thin max-h-[420px] overflow-y-auto border-t border-line"><FollowList items={follow} /></div> : <Empty icon={PartyPopper} title="Nenhum follow-up pendente" />}
            </Card>

            <Card className="overflow-hidden">
              <CardHead title="Reuniões e próximos contatos" subtitle={plural(meetings.length, "agendado", "agendados")} />
              {meetings.length ? (
                <ul className="scroll-thin max-h-64 divide-y divide-line overflow-y-auto border-t border-line">
                  {meetings.map((l) => (
                    <li key={l.id}>
                      <button onClick={() => openLead(l.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2">
                        <Avatar name={l.name} size={30} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{l.name}</span><span className="block truncate text-[12px] text-ink-3">{l.instagram || l.phone || "—"}</span></span>
                        <span className={cn("tabular text-[12.5px] font-semibold", l.followUp === t ? "text-amber" : "text-ink-3")}>{l.followUp === t ? "Hoje" : fmtDate(l.followUp)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon={CalendarDays} title="Nada agendado" />
              )}
            </Card>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHead title="Leads convertidos" subtitle={plural(converted.length, "cliente", "clientes")} />
            {converted.length ? (
              <ul className="scroll-thin max-h-72 divide-y divide-line overflow-y-auto border-t border-line">
                {converted.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => openLead(l.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2">
                      <Avatar name={l.name} size={30} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{l.name}</span><span className="block truncate text-[12px] text-ink-3">{l.instagram || l.company || l.phone || "—"} · {plural(l.serviceMonths || 0, "mês", "meses")}</span></span>
                      <span className="tabular text-[13px] font-semibold text-brand-strong">{fmtMoney(l.value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Trophy} title="Nenhum convertido ainda" />
            )}
          </Card>

          <Card>
            <CardHead title="Recados para o Thiago" subtitle="Aparecem na área Thiago pessoal" />
            <div className="px-5 pb-5">
              <Textarea rows={7} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Dúvidas, pedidos de horário, leads que precisam dele" disabled={!canEdit} />
              {canEdit && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => void saveObs()} disabled={saving || obs === (settings[SETTING.estagiarioObs] ?? "")}>
                    {saving && <Loader2 className="animate-spin" />} Salvar recado
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
