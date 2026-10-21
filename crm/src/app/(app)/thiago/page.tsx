"use client";
import { useMemo } from "react";
import { BriefcaseBusiness, CalendarDays, GraduationCap, Pencil, Plus, Trash2, Users, User, Zap } from "lucide-react";
import { useCRM } from "@/lib/store";
import { WEEKDAYS } from "@/lib/constants";
import { funnelPerfil, monthHours, projection } from "@/lib/domain";
import { SETTING, TAG_PLANILHA } from "@/lib/config";
import type { Lead, Mentorship } from "@/lib/types";
import { cn, fmtDate, fmtMoney, fmtMoneyCompact, fmtNum, isOp, pct, today } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Empty } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Columns, SplitBar } from "@/components/charts/bars";
import { CountUp } from "@/components/ui/count-up";

function TypeIcon({ type }: { type: string }) {
  if (type.includes("Grupo")) return <Users className="size-[18px]" />;
  if (type.includes("Consul")) return <BriefcaseBusiness className="size-[18px]" />;
  if (type.includes("Inten")) return <Zap className="size-[18px]" />;
  return <User className="size-[18px]" />;
}

function MentorshipRow({ m }: { m: Mentorship }) {
  const { setDialog, confirm, deleteMentorship, canEdit } = useCRM();
  const mh = monthHours(m);
  return (
    <li className="group flex items-start gap-3.5 px-5 py-3.5">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", m.active ? "bg-brand-soft text-brand-strong" : "bg-sunken text-ink-3")}><TypeIcon type={m.type} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14.5px] font-semibold text-ink">{m.client}</p>
          <Chip color={m.active ? "var(--brand)" : "var(--ink-3)"}>{m.type}</Chip>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {fmtNum(m.hoursPerSession)}h por sessão · {m.sessionsPerWeek}x por mês · {m.totalWeeks} meses · <span className="text-ink-2">{fmtNum(mh)}h/mês</span>
          {m.startDate && <> · de {fmtDate(m.startDate)} a {fmtDate(m.endDate)}</>}
        </p>
        {m.notes && <p className="mt-1 text-[12.5px] italic text-ink-3">{m.notes}</p>}
      </div>
      <div className="flex shrink-0 items-start gap-2">
        {m.value > 0 && <span className="tabular pt-0.5 text-[13.5px] font-semibold text-brand-strong">{fmtMoney(m.value)}<span className="font-normal text-ink-3">/mês</span></span>}
        {canEdit && (
          <div className="flex gap-0.5 opacity-50 transition-opacity group-hover:opacity-100">
            <Button size="icon-xs" variant="ghost" onClick={() => setDialog({ kind: "mentorship", mentorshipId: m.id })} aria-label="Editar mentoria"><Pencil /></Button>
            <Button size="icon-xs" variant="danger-ghost" onClick={() => confirm("Excluir mentoria", `A mentoria de “${m.client}” será excluída.`, "Excluir mentoria", () => deleteMentorship(m.id))} aria-label="Excluir mentoria"><Trash2 /></Button>
          </div>
        )}
      </div>
    </li>
  );
}

function ProfileBlock({ label, color, leads, conv, total }: { label: string; color: string; leads: Lead[]; conv: number; total: number }) {
  const val = leads.reduce((s, l) => s + (l.value || 0), 0);
  return (
    <div className="rounded-2xl border border-line p-4" style={{ background: `color-mix(in oklab, ${color} 6%, var(--surface))` }}>
      <p className="text-[13px] font-semibold" style={{ color }}>{label}</p>
      <p className="tabular mt-1 font-display text-[44px] font-semibold leading-none tracking-tight text-ink"><CountUp value={leads.length} /></p>
      <p className="text-[12.5px] text-ink-3">leads registrados</p>
      <dl className="mt-3 space-y-1 text-[13px]">
        <div className="flex justify-between"><dt className="text-ink-3">Convertidos</dt><dd className="tabular font-semibold text-ok">{conv}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Pipeline</dt><dd className="tabular font-semibold text-ink">{fmtMoney(val)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Parcela da planilha</dt><dd className="tabular font-semibold" style={{ color }}>{pct(leads.filter((l) => l.tags.includes(TAG_PLANILHA)).length, total)}%</dd></div>
      </dl>
    </div>
  );
}

export default function ThiagoPage() {
  const { mentorships, leads, funnels, settings, setDialog, canEdit } = useCRM();
  const t = today();

  const d = useMemo(() => {
    const active = mentorships.filter((m) => m.active);
    const inactive = mentorships.filter((m) => !m.active);
    const hours = active.reduce((s, m) => s + monthHours(m), 0);
    const contract = active.reduce((s, m) => s + monthHours(m) * (Number(m.totalWeeks) || 0), 0);
    const revenue = active.reduce((s, m) => s + (Number(m.value) || 0), 0);
    const proj = projection(mentorships, 12);
    const upcoming = mentorships
      .flatMap((m) => m.scheduleSessions.filter((x) => x >= t).slice(0, 5).map((date) => ({ date, m })))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
    const gest = leads.filter((l) => funnelPerfil(funnels.find((f) => f.id === l.funnelId)) === "gestor");
    const aut = leads.filter((l) => funnelPerfil(funnels.find((f) => f.id === l.funnelId)) === "autonomo");
    const planTotal = [...gest, ...aut].filter((l) => l.tags.includes(TAG_PLANILHA)).length;
    const op = leads.filter(isOp);
    return {
      active, inactive, hours, contract, revenue, proj, upcoming, gest, aut, planTotal,
      op: op.length,
      opConv: op.filter((l) => l.converted).length,
      ig: op.filter((l) => l.origin === "ig_comentario" || l.origin === "ig_seguidor").length,
      vetPct: pct(op.filter((l) => l.isVet).length, op.length),
    };
  }, [mentorships, leads, funnels, t]);

  const load = d.hours <= 10 ? { l: "Saudável", c: "var(--ok)", bg: "bg-ok-soft" } : d.hours <= 20 ? { l: "Moderada", c: "var(--amber)", bg: "bg-amber-soft" } : { l: "Alta", c: "var(--coral)", bg: "bg-coral-soft" };
  const projTotal = d.proj.reduce((s, p) => s + p.revenue, 0);
  const gaps = d.proj.filter((p, i) => i > 0 && p.revenue === 0).length;

  return (
    <>
      <PageHeader title="Thiago pessoal" subtitle="Mentorias, carga horária e receita recorrente">
        {canEdit && <Button size="sm" onClick={() => setDialog({ kind: "mentorship" })}><Plus /> Nova mentoria</Button>}
      </PageHeader>
      <PageBody className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card className={cn("flex flex-col justify-between p-5", load.bg)}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: load.c }}>Carga horária {load.l.toLowerCase()}</p>
              <p className="tabular mt-1 font-display text-[64px] font-semibold leading-none tracking-[-0.04em] text-ink">
                <CountUp value={d.hours} format={(n) => fmtNum(n)} />
                <span className="text-2xl font-medium text-ink-3"> h/mês</span>
              </p>
              <p className="mt-2 text-[13px] text-ink-2">{fmtNum(d.contract, 0)}h somando todos os contratos ativos. Até 10h é saudável, acima de 20h é alta.</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 dark:border-white/10">
              <div><p className="tabular font-display text-2xl font-semibold text-ink">{d.active.length}</p><p className="text-[12.5px] text-ink-3">mentorias ativas</p></div>
              <div><p className="tabular font-display text-2xl font-semibold text-ink">{fmtMoneyCompact(d.revenue)}</p><p className="text-[12.5px] text-ink-3">receita por mês</p></div>
            </div>
          </Card>

          <Card>
            <CardHead title="Receita das mentorias nos próximos 12 meses" subtitle={gaps ? `${gaps} ${gaps === 1 ? "mês fica" : "meses ficam"} sem receita com os contratos atuais` : "Pelas datas de início e término de cada mentoria"}>
              <div className="text-right">
                <p className="tabular font-display text-xl font-semibold text-brand-strong">{fmtMoneyCompact(projTotal)}</p>
                <p className="text-[12px] text-ink-3">no período</p>
              </div>
            </CardHead>
            <div className="px-5 pb-5">
              <Columns data={d.proj.map((p) => ({ key: p.key, label: p.short, value: p.revenue, title: `${p.label}: ${fmtMoney(p.revenue)}${p.clients.length ? " · " + p.clients.join(", ") : ""}` }))} format={fmtMoneyCompact} highlight={d.proj[0]?.key} height={180} />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card className="overflow-hidden">
            <CardHead title="Mentorias ativas" subtitle={`${d.active.length} em andamento`} />
            {d.active.length ? <ul className="divide-y divide-line border-t border-line">{d.active.map((m) => <MentorshipRow key={m.id} m={m} />)}</ul> : <Empty icon={GraduationCap} title="Nenhuma mentoria ativa" />}
          </Card>

          <Card className="overflow-hidden">
            <CardHead title="Próximas sessões" subtitle={d.upcoming.length ? `${d.upcoming.length} agendadas` : "Configure a agenda nas mentorias"} />
            {d.upcoming.length ? (
              <ul className="divide-y divide-line border-t border-line">
                {d.upcoming.map(({ date, m }) => {
                  const dt = new Date(date + "T00:00:00");
                  const isToday = date === t;
                  return (
                    <li key={m.id + date} className="flex items-center gap-3.5 px-5 py-2.5">
                      <span className={cn("grid w-11 shrink-0 rounded-xl py-1 text-center", isToday ? "bg-brand text-brand-ink" : "bg-sunken")}>
                        <span className="tabular font-display text-lg font-semibold leading-tight">{dt.getDate()}</span>
                        <span className={cn("text-[11px]", isToday ? "" : "text-ink-3")}>{WEEKDAYS[dt.getDay()]}</span>
                      </span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{m.client}</span><span className="block text-[12px] text-ink-3">{m.type}</span></span>
                      {isToday && <Chip color="var(--brand)">Hoje</Chip>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty icon={CalendarDays} title="Nenhuma sessão agendada" />
            )}
          </Card>
        </div>

        <Card>
          <CardHead title="Vendas por perfil de cliente" subtitle={`Gestores contra veterinários autônomos · ${d.planTotal} vieram da planilha`} />
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1fr_1fr_1fr]">
            <ProfileBlock label="Gestores veterinários" color="#2563eb" leads={d.gest} conv={d.gest.filter((l) => l.converted).length} total={d.planTotal} />
            <ProfileBlock label="Veterinários autônomos" color="#059669" leads={d.aut} conv={d.aut.filter((l) => l.converted).length} total={d.planTotal} />
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-surface-2 p-4">
              <div>
                <p className="text-[13px] font-semibold text-ink-2">Proporção</p>
                <SplitBar className="mt-2" parts={[{ value: d.gest.length, color: "#2563eb" }, { value: d.aut.length, color: "#059669" }]} />
                <div className="mt-1.5 flex justify-between text-[12px]">
                  <span className="text-[#2563eb]">Gestores {pct(d.gest.length, d.gest.length + d.aut.length)}%</span>
                  <span className="text-[#059669]">{pct(d.aut.length, d.gest.length + d.aut.length)}% autônomos</span>
                </div>
              </div>
              <dl className="space-y-1.5 text-[13px]">
                <p className="mb-1 font-semibold text-ink-2">Visão comercial (sem planilha)</p>
                <div className="flex justify-between"><dt className="text-ink-3">Leads</dt><dd className="tabular font-semibold">{d.op}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-3">Clientes</dt><dd className="tabular font-semibold text-ok">{d.opConv}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-3">Via Instagram</dt><dd className="tabular font-semibold text-[#d6336c]">{d.ig}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-3">Veterinários</dt><dd className={cn("tabular font-semibold", d.vetPct >= 60 ? "text-sky" : "text-coral")}>{d.vetPct}%</dd></div>
              </dl>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="Recados do estagiário" />
            <p className="whitespace-pre-wrap px-5 pb-5 text-[14px] leading-relaxed text-ink-2">{settings[SETTING.estagiarioObs] || <span className="italic text-ink-3">Nenhum recado por enquanto.</span>}</p>
          </Card>
          {d.inactive.length > 0 && (
            <Card className="overflow-hidden">
              <CardHead title="Mentorias encerradas" subtitle={`${d.inactive.length} no histórico`} />
              <ul className="divide-y divide-line border-t border-line">{d.inactive.map((m) => <MentorshipRow key={m.id} m={m} />)}</ul>
            </Card>
          )}
        </div>
      </PageBody>
    </>
  );
}
