"use client";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCRM } from "@/lib/store";
import { MENTORSHIP_TYPES, ORIGIN_GROUPS, ORIGINS, PALETTE, WEEKDAYS, MONTHS } from "@/lib/constants";
import { generateSessions, mentorshipEnd } from "@/lib/domain";
import type { Lead, Mentorship, Priority, ScheduleType, Stage, TaskStatus } from "@/lib/types";
import { cn, fmtNum, today, uid } from "@/lib/utils";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Notice } from "@/components/ui/card";
import { StageEditor, cleanStages } from "./stage-editor";
import { EloDialog } from "./elo-dialog";

function useBusy() {
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }
  return [busy, run] as const;
}

/* ─────────────────── Lead ─────────────────── */

type LeadForm = Omit<Lead, "id" | "activities" | "date" | "elo">;

function LeadDialog({ leadId, funnelId, stageId }: { leadId?: string; funnelId?: string; stageId?: string }) {
  const { leads, funnels, activeFunnelId, saveLead, setDialog } = useCRM();
  const existing = leads.find((l) => l.id === leadId);
  const startFunnel = existing?.funnelId ?? funnelId ?? activeFunnelId ?? funnels[0]?.id ?? null;
  const [f, setF] = useState<LeadForm>(() =>
    existing
      ? { ...existing }
      : {
          name: "", email: "", phone: "", instagram: "", company: "", origin: "ig_comentario", isVet: true,
          funnelId: startFunnel, stageId: stageId ?? funnels.find((x) => x.id === startFunnel)?.stages[0]?.id ?? null,
          value: 0, tags: [], notes: "", followUp: "", converted: false, convertedDate: "", serviceMonths: 0,
        },
  );
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(", "));
  const [err, setErr] = useState("");
  const [busy, run] = useBusy();
  const funnel = funnels.find((x) => x.id === f.funnelId);
  const set = <K extends keyof LeadForm>(k: K, v: LeadForm[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!f.name.trim()) return setErr("Informe o nome do lead.");
    if (!f.funnelId || !f.stageId) return setErr("Escolha o funil e a etapa.");
    void run(async () => {
      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const saved = await saveLead(
        {
          ...f,
          name: f.name.trim(),
          tags,
          convertedDate: f.converted ? f.convertedDate || today() : "",
          serviceMonths: f.converted ? f.serviceMonths : 0,
        },
        leadId,
      );
      if (saved) setDialog(null);
    });
  }

  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      size="lg"
      title={existing ? "Editar lead" : "Novo lead"}
      description={existing ? existing.name : "Quem é, de onde veio e em que ponto do funil está."}
      footer={
        <>
          {err && <span className="mr-auto text-[13px] font-medium text-coral">{err}</span>}
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button onClick={() => submit()} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{existing ? "Salvar alterações" : "Criar lead"}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
        </Field>
        <Field label="WhatsApp" hint="Com DDD. Necessário para enviar ao Elo.">
          <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(79) 99999-9999" inputMode="tel" />
        </Field>
        <Field label="Instagram">
          <Input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@perfil" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="email@clinica.com" />
        </Field>
        <Field label="Clínica ou empresa">
          <Input value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Opcional" />
        </Field>

        <div className="h-px bg-line sm:col-span-2" />

        <Field label="Funil">
          <Select
            value={f.funnelId ?? ""}
            onChange={(e) => {
              const nf = funnels.find((x) => x.id === e.target.value);
              setF((p) => ({ ...p, funnelId: e.target.value, stageId: nf?.stages[0]?.id ?? null }));
            }}
          >
            {funnels.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
          </Select>
        </Field>
        <Field label="Etapa">
          <Select value={f.stageId ?? ""} onChange={(e) => set("stageId", e.target.value)}>
            {funnel?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Origem">
          <Select value={f.origin} onChange={(e) => set("origin", e.target.value)}>
            {ORIGIN_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.keys.map((k) => <option key={k} value={k}>{ORIGINS[k].label}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Valor estimado (R$)">
          <Input type="number" min={0} value={f.value || ""} onChange={(e) => set("value", parseFloat(e.target.value) || 0)} placeholder="0" />
        </Field>
        <Field label="Perfil">
          <Segmented size="sm" className="w-full" value={f.isVet ? "sim" : "nao"} onChange={(v) => set("isVet", v === "sim")} options={[{ value: "sim", label: "Veterinário(a)" }, { value: "nao", label: "Outro perfil" }]} />
        </Field>
        <Field label="Próximo contato (follow-up)">
          <Input type="date" value={f.followUp} onChange={(e) => set("followUp", e.target.value)} />
        </Field>

        <div className="rounded-xl border border-line bg-surface-2 p-3 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.converted} onChange={(e) => setF((p) => ({ ...p, converted: e.target.checked, convertedDate: e.target.checked ? p.convertedDate || today() : p.convertedDate }))} />
            Virou cliente
          </label>
          {f.converted && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Data da conversão"><Input type="date" value={f.convertedDate} onChange={(e) => set("convertedDate", e.target.value)} /></Field>
              <Field label="Meses de serviço juntos"><Input type="number" min={1} max={120} value={f.serviceMonths || ""} onChange={(e) => set("serviceMonths", parseInt(e.target.value) || 0)} placeholder="Ex.: 6" /></Field>
            </div>
          )}
        </div>

        <Field label="Notas" className="sm:col-span-2">
          <Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Contexto da conversa, dores, objeções" />
        </Field>
        <Field label="Tags" hint="Separadas por vírgula. Tags do sistema: planilha, abordado, elo, feminino, masculino." className="sm:col-span-2">
          <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="vip, quente, retorno" />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

/* ─────────────────── Funil ─────────────────── */

function FunnelDialog({ funnelId }: { funnelId?: string }) {
  const { funnels, leads, saveFunnel, setDialog } = useCRM();
  const ex = funnels.find((f) => f.id === funnelId);
  const [name, setName] = useState(ex?.name ?? "");
  const [icon, setIcon] = useState(ex?.icon ?? "📋");
  const [color, setColor] = useState(ex?.color ?? PALETTE[0]);
  const [stages, setStages] = useState<Stage[]>(
    ex?.stages.map((s) => ({ ...s })) ?? [
      { id: uid(), name: "Novo lead", color: "#3b82f6" },
      { id: uid(), name: "Em contato", color: "#7c3aed" },
      { id: uid(), name: "Proposta", color: "#d97706" },
      { id: uid(), name: "Fechado", color: "#22c55e" },
    ],
  );
  const [busy, run] = useBusy();
  const counts = useMemo(() => (ex ? Object.fromEntries(ex.stages.map((s) => [s.id, leads.filter((l) => l.funnelId === ex.id && l.stageId === s.id).length])) : undefined), [ex, leads]);

  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      size="md"
      title={ex ? "Editar funil" : "Novo funil"}
      description="A última etapa conta como fechamento nos relatórios."
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={() => void run(async () => {
              await saveFunnel({ name: name.trim(), icon: icon.trim() || "📋", color, stages: cleanStages(stages) }, ex?.id);
              setDialog(null);
            })}
          >
            {busy && <Loader2 className="animate-spin" />} {ex ? "Salvar funil" : "Criar funil"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="Nome"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Gestores — planilha" /></Field>
          <Field label="Ícone"><Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="text-center text-lg" /></Field>
        </div>
        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn("size-8 rounded-full transition-transform hover:scale-110", c === color && "ring-2 ring-ink ring-offset-2 ring-offset-surface")} style={{ background: c }} aria-label={`Cor ${c}`} />
            ))}
          </div>
        </Field>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">Etapas (arraste para reordenar)</p>
          <StageEditor stages={stages} onChange={setStages} counts={counts} />
        </div>
      </div>
    </Modal>
  );
}

function StagesDialog({ funnelId }: { funnelId: string }) {
  const { funnels, leads, saveStages, setDialog } = useCRM();
  const f = funnels.find((x) => x.id === funnelId);
  const [stages, setStages] = useState<Stage[]>(f?.stages.map((s) => ({ ...s })) ?? []);
  const [busy, run] = useBusy();
  const counts = useMemo(() => Object.fromEntries((f?.stages ?? []).map((s) => [s.id, leads.filter((l) => l.funnelId === funnelId && l.stageId === s.id).length])), [f, leads, funnelId]);
  if (!f) return null;
  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      title="Etapas do funil"
      description={`${f.icon} ${f.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button disabled={busy} onClick={() => void run(async () => { await saveStages(f.id, cleanStages(stages)); setDialog(null); })}>
            {busy && <Loader2 className="animate-spin" />} Salvar etapas
          </Button>
        </>
      }
    >
      <StageEditor stages={stages} onChange={setStages} counts={counts} />
    </Modal>
  );
}

function MoveDialog({ leadId }: { leadId: string }) {
  const { leads, funnels, moveLeadTo, setDialog } = useCRM();
  const l = leads.find((x) => x.id === leadId);
  const [fid, setFid] = useState(l?.funnelId ?? funnels[0]?.id ?? "");
  const [sid, setSid] = useState(l?.stageId ?? "");
  const f = funnels.find((x) => x.id === fid);
  const [busy, run] = useBusy();
  if (!l) return null;
  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      size="sm"
      title="Mover lead"
      description={l.name}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button disabled={busy || !sid} onClick={() => void run(async () => { await moveLeadTo(l.id, fid, sid); setDialog(null); })}>Mover</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Funil">
          <Select value={fid} onChange={(e) => { setFid(e.target.value); setSid(funnels.find((x) => x.id === e.target.value)?.stages[0]?.id ?? ""); }}>
            {funnels.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
          </Select>
        </Field>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-ink-2">Etapa</p>
          <div className="grid gap-1.5">
            {f?.stages.map((s) => (
              <button key={s.id} type="button" onClick={() => setSid(s.id)} className={cn("flex h-10 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-medium transition-colors", sid === s.id ? "border-brand bg-brand-soft text-ink" : "border-line hover:bg-surface-2")}>
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
                {l.stageId === s.id && l.funnelId === fid && <span className="ml-auto text-xs text-ink-3">atual</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────── Tarefa ─────────────────── */

function TaskDialog({ taskId }: { taskId?: string }) {
  const { tasks, saveTask, setDialog } = useCRM();
  const ex = tasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(ex?.title ?? "");
  const [desc, setDesc] = useState(ex?.desc ?? "");
  const [priority, setPriority] = useState<Priority>(ex?.priority ?? "media");
  const [status, setStatus] = useState<TaskStatus>(ex?.status ?? "pendente");
  const [deadline, setDeadline] = useState(ex?.deadline ?? "");
  const [busy, run] = useBusy();
  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      title={ex ? "Editar tarefa" : "Nova tarefa"}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button disabled={busy || !title.trim()} onClick={() => void run(async () => { await saveTask({ title: title.trim(), desc: desc.trim(), priority, status, deadline }, ex?.id); setDialog(null); })}>
            {ex ? "Salvar tarefa" : "Criar tarefa"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Prospectar 10 leads via Instagram" /></Field>
        <Field label="Instruções"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que precisa ser feito e como" /></Field>
        <Field label="Prioridade">
          <Segmented size="sm" value={priority} onChange={setPriority} options={[{ value: "urgente", label: "Urgente" }, { value: "alta", label: "Alta" }, { value: "media", label: "Média" }, { value: "baixa", label: "Baixa" }]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Situação">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
            </Select>
          </Field>
          <Field label="Prazo"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────── Mentoria ─────────────────── */

function MentorshipDialog({ mentorshipId }: { mentorshipId?: string }) {
  const { mentorships, saveMentorship, setDialog } = useCRM();
  const ex = mentorships.find((m) => m.id === mentorshipId);
  const [m, setM] = useState<Omit<Mentorship, "id">>(() =>
    ex
      ? { ...ex }
      : { client: "", type: MENTORSHIP_TYPES[0], hoursPerSession: 1.5, sessionsPerWeek: 2, totalWeeks: 3, startDate: "", endDate: "", active: true, value: 0, notes: "", scheduleType: "nenhuma", scheduleDayOfWeek: [], scheduleDayOfMonth: null, scheduleIntervalDays: null, scheduleSessions: [] },
  );
  const [busy, run] = useBusy();
  const set = <K extends keyof Mentorship>(k: K, v: Mentorship[K]) => setM((p) => ({ ...p, [k]: v }));
  const days = Array.isArray(m.scheduleDayOfWeek) ? m.scheduleDayOfWeek : m.scheduleDayOfWeek != null ? [m.scheduleDayOfWeek] : [];

  // término = início + meses, recalculado quando um dos dois muda
  const setPeriod = (patch: Partial<Pick<Mentorship, "startDate" | "totalWeeks">>) =>
    setM((p) => {
      const n = { ...p, ...patch };
      return { ...n, endDate: n.startDate && n.totalWeeks ? mentorshipEnd(n.startDate, n.totalWeeks) : n.endDate };
    });

  const preview = generateSessions({ ...m, scheduleDayOfWeek: days });

  function save() {
    void run(async () => {
      const st = m.scheduleType;
      const data: Omit<Mentorship, "id"> = {
        ...m,
        client: m.client.trim(),
        endDate: m.endDate || mentorshipEnd(m.startDate, m.totalWeeks),
        scheduleDayOfWeek: st === "semanal" || st === "quinzenal" ? days : null,
        scheduleDayOfMonth: st === "mensal_dia" ? m.scheduleDayOfMonth : null,
        scheduleIntervalDays: st === "intervalo" ? m.scheduleIntervalDays : null,
      };
      data.scheduleSessions = generateSessions(data);
      await saveMentorship(data, ex?.id);
      setDialog(null);
    });
  }

  const hm = (Number(m.hoursPerSession) || 0) * (Number(m.sessionsPerWeek) || 0);

  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      size="lg"
      title={ex ? "Editar mentoria" : "Nova mentoria"}
      description="Carga horária e receita entram na projeção de 12 meses."
      footer={
        <>
          <span className="mr-auto text-[13px] text-ink-3">{fmtNum(hm)}h por mês · {fmtNum(hm * (m.totalWeeks || 0), 0)}h no contrato</span>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button disabled={busy || !m.client.trim()} onClick={save}>{ex ? "Salvar mentoria" : "Cadastrar mentoria"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente"><Input autoFocus value={m.client} onChange={(e) => set("client", e.target.value)} placeholder="Dr. João Mendes ou nome da clínica" /></Field>
        <Field label="Tipo">
          <Select value={m.type} onChange={(e) => set("type", e.target.value)}>
            {MENTORSHIP_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Horas por sessão"><Input type="number" min={0.5} step={0.5} value={m.hoursPerSession || ""} onChange={(e) => set("hoursPerSession", parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Sessões por mês"><Input type="number" min={1} max={31} value={m.sessionsPerWeek || ""} onChange={(e) => set("sessionsPerWeek", parseInt(e.target.value) || 1)} /></Field>
        <Field label="Duração (meses)"><Input type="number" min={1} value={m.totalWeeks || ""} onChange={(e) => setPeriod({ totalWeeks: parseInt(e.target.value) || 0 })} /></Field>
        <Field label="Valor mensal (R$)"><Input type="number" min={0} value={m.value || ""} onChange={(e) => set("value", parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Início"><Input type="date" value={m.startDate} onChange={(e) => setPeriod({ startDate: e.target.value })} /></Field>
        <Field label="Término" hint="Calculado pelo início + duração. Pode ajustar."><Input type="date" value={m.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>

        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3.5 sm:col-span-2">
          <Field label="Agenda de sessões">
            <Select value={m.scheduleType} onChange={(e) => set("scheduleType", e.target.value as ScheduleType)}>
              <option value="nenhuma">Sem agenda fixa</option>
              <option value="semanal">Toda semana</option>
              <option value="quinzenal">A cada 15 dias</option>
              <option value="mensal_dia">Todo dia X do mês</option>
              <option value="intervalo">A cada N dias</option>
            </Select>
          </Field>
          {(m.scheduleType === "semanal" || m.scheduleType === "quinzenal") && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button key={d} type="button" onClick={() => set("scheduleDayOfWeek", on ? days.filter((x) => x !== i) : [...days, i].sort())} className={cn("h-8 w-11 rounded-lg border text-[13px] font-semibold transition-colors", on ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          {m.scheduleType === "mensal_dia" && <Field label="Dia do mês (1 a 28)"><Input type="number" min={1} max={28} value={m.scheduleDayOfMonth ?? ""} onChange={(e) => set("scheduleDayOfMonth", parseInt(e.target.value) || null)} /></Field>}
          {m.scheduleType === "intervalo" && <Field label="Intervalo em dias"><Input type="number" min={1} value={m.scheduleIntervalDays ?? ""} onChange={(e) => set("scheduleIntervalDays", parseInt(e.target.value) || null)} /></Field>}
          {m.scheduleType !== "nenhuma" && (
            preview.length ? (
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-2">{preview.length} sessões serão agendadas</p>
                <div className="scroll-thin flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                  {preview.map((d) => {
                    const dt = new Date(d + "T00:00:00");
                    return <span key={d} className="tabular rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-2 ring-1 ring-line">{WEEKDAYS[dt.getDay()]} {dt.getDate()} {MONTHS[dt.getMonth()]}</span>;
                  })}
                </div>
              </div>
            ) : (
              <Notice tone="amber">Nenhuma sessão gerada ainda. Preencha o início e os dias.</Notice>
            )
          )}
        </div>

        <Field label="Situação">
          <Segmented size="sm" value={m.active ? "ativa" : "encerrada"} onChange={(v) => set("active", v === "ativa")} options={[{ value: "ativa", label: "Ativa" }, { value: "encerrada", label: "Encerrada" }]} />
        </Field>
        <Field label="Observações"><Textarea rows={2} value={m.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ─────────────────── Confirmação ─────────────────── */

function ConfirmDialog({ title, body, confirm, run: action }: { title: string; body: string; confirm: string; run: () => Promise<void> | void }) {
  const { setDialog } = useCRM();
  const [busy, run] = useBusy();
  return (
    <Modal
      open
      onOpenChange={(v) => !v && setDialog(null)}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
          <Button variant="danger" disabled={busy} onClick={() => void run(async () => { await action(); setDialog(null); })}>
            {busy && <Loader2 className="animate-spin" />} {confirm}
          </Button>
        </>
      }
    >
      <p className="pb-2 text-sm leading-relaxed text-ink-2">{body}</p>
    </Modal>
  );
}

export function Dialogs() {
  const { dialog } = useCRM();
  if (!dialog) return null;
  switch (dialog.kind) {
    case "lead":
      return <LeadDialog key={dialog.leadId ?? "novo"} {...dialog} />;
    case "funnel":
      return <FunnelDialog funnelId={dialog.funnelId} />;
    case "stages":
      return <StagesDialog funnelId={dialog.funnelId} />;
    case "move":
      return <MoveDialog leadId={dialog.leadId} />;
    case "task":
      return <TaskDialog taskId={dialog.taskId} />;
    case "mentorship":
      return <MentorshipDialog mentorshipId={dialog.mentorshipId} />;
    case "elo":
      return <EloDialog leadIds={dialog.leadIds} />;
    case "confirm":
      return <ConfirmDialog {...dialog} />;
  }
}
