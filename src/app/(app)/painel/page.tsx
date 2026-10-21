"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, PartyPopper } from "lucide-react";
import { useCRM } from "@/lib/store";
import { ORIGINS, origin } from "@/lib/constants";
import { isClosed, isOperationalFunnel } from "@/lib/domain";
import { addDays, fmtMoneyCompact, isOp, pct, plural, today } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHead, Empty } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { CountUp } from "@/components/ui/count-up";
import { Columns, HBars, SplitBar } from "@/components/charts/bars";
import { FollowList, followSummary, useFollowUps } from "@/components/crm/follow-list";
import { LeadTable } from "@/components/crm/lead-table";

type Period = "7" | "30" | "90" | "all";

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Kpi({ label, value, format, sub, accent, i }: { label: string; value: number; format?: (n: number) => string; sub: React.ReactNode; accent: string; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.35 }} className="flex items-baseline justify-between gap-3 border-b border-line py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2"><span className="size-1.5 rounded-full" style={{ background: accent }} />{label}</p>
        <p className="mt-0.5 truncate text-[12px] text-ink-3">{sub}</p>
      </div>
      <CountUp value={value} format={format} className="tabular font-display text-[28px] font-semibold leading-none tracking-tight" />
    </motion.div>
  );
}

export default function PainelPage() {
  const { user, leads, funnels } = useCRM();
  const [period, setPeriod] = useState<Period>("30");
  const follow = useFollowUps();
  const fs = followSummary(follow);

  const m = useMemo(() => {
    const cutoff = period === "all" ? "" : addDays(today(), -Number(period));
    const op = leads.filter(isOp).filter((l) => !cutoff || l.date >= cutoff);
    const conv = op.filter((l) => l.converted);
    const closed = op.filter((l) => isClosed(l, funnels));
    const ig = op.filter((l) => origin(l.origin).group === "instagram");
    const vet = op.filter((l) => l.isVet).length;
    const byOrigin = Object.keys(ORIGINS)
      .map((k) => ({ k, n: op.filter((l) => l.origin === k).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n);
    const opFunnels = funnels.filter(isOperationalFunnel);
    return {
      op,
      total: op.length,
      pipeline: op.reduce((s, l) => s + (l.value || 0), 0),
      conv,
      convRate: pct(closed.length, op.length),
      closedVal: closed.reduce((s, l) => s + (l.value || 0), 0),
      avgMonths: conv.length ? Math.round(conv.reduce((s, l) => s + (l.serviceMonths || 0), 0) / conv.length) : 0,
      igC: ig.filter((l) => l.origin === "ig_comentario").length,
      igS: ig.filter((l) => l.origin === "ig_seguidor").length,
      wpp: op.filter((l) => l.origin === "whatsapp").length,
      frio: ["indicacao", "organico", "evento"].map((k) => ({ k, n: op.filter((l) => l.origin === k).length })),
      vet,
      nonVet: op.length - vet,
      vetPct: pct(vet, op.length),
      byOrigin,
      byFunnel: opFunnels.map((f) => ({ f, n: op.filter((l) => l.funnelId === f.id).length })),
      recent: [...op].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    };
  }, [leads, funnels, period]);

  const weeks = useMemo(() => {
    const op = leads.filter(isOp);
    return Array.from({ length: 8 }, (_, i) => {
      const end = addDays(today(), -7 * (7 - i));
      const start = addDays(end, -6);
      return { key: end, label: end.slice(8, 10) + "/" + end.slice(5, 7), value: op.filter((l) => l.date >= start && l.date <= end).length, title: `${start.slice(8, 10)}/${start.slice(5, 7)} a ${end.slice(8, 10)}/${end.slice(5, 7)}` };
    });
  }, [leads]);

  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader title={`${greet()}, ${user?.name.split(" ")[0] ?? ""}`} subtitle={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}>
        <Segmented<Period>
          size="sm"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: "7 dias" },
            { value: "30", label: "30 dias" },
            { value: "90", label: "90 dias" },
            { value: "all", label: "Tudo" },
          ]}
        />
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          {/* Quem contatar hoje — o centro do painel */}
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden bg-navy px-5 pb-5 pt-5 text-navy-ink">
              <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-[#2d9d8f]/20 blur-2xl" />
              <p className="relative text-[13px] font-medium text-navy-ink-2">Para contatar agora</p>
              <div className="relative mt-1 flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="font-display text-[56px] font-semibold leading-none tracking-[-0.04em] text-white">
                  <CountUp value={fs.total} />
                </p>
                <div className="flex gap-5 pb-1.5 text-[13px]">
                  <span><b className="tabular font-semibold text-[#ff9a88]">{fs.atrasados}</b> <span className="text-navy-ink-2">atrasados</span></span>
                  <span><b className="tabular font-semibold text-[#f6cf8a]">{fs.hoje}</b> <span className="text-navy-ink-2">marcados para hoje</span></span>
                  <span><b className="tabular font-semibold text-[#8fe3d6]">{fs.parados}</b> <span className="text-navy-ink-2">parados na etapa</span></span>
                </div>
              </div>
            </div>
            {follow.length ? (
              <>
                <FollowList items={follow} limit={6} />
                {follow.length > 6 && (
                  <Link href="/estagiario" className="flex items-center justify-center gap-1 border-t border-line py-3 text-[13px] font-semibold text-brand hover:bg-surface-2">
                    Ver todos os {follow.length} follow-ups <ArrowUpRight className="size-4" />
                  </Link>
                )}
              </>
            ) : (
              <Empty icon={PartyPopper} title="Nenhum follow-up pendente">Todos os leads em andamento foram contatados dentro do prazo da etapa.</Empty>
            )}
          </Card>

          <div className="flex flex-col gap-5">
          <Card className="px-5 py-1.5">
            <Kpi i={0} label="Leads operacionais" value={m.total} sub="Sem a planilha importada" accent="var(--sky)" />
            <Kpi i={1} label="Pipeline" value={m.pipeline} format={fmtMoneyCompact} sub="Soma dos valores estimados" accent="var(--brand)" />
            <Kpi i={2} label="Clientes convertidos" value={m.conv.length} sub={m.conv.length ? `Ficam em média ${m.avgMonths} meses` : "Nenhum no período"} accent="var(--ok)" />
            <Kpi i={3} label="Taxa de fechamento" value={m.convRate} format={(n) => `${Math.round(n)}%`} sub={`${fmtMoneyCompact(m.closedVal)} na última etapa`} accent="var(--violet)" />
          </Card>
          <Card className="flex-1">
            <CardHead title="Leads novos por semana" subtitle="Últimas 8 semanas, sem a planilha" />
            <div className="px-5 pb-4">
              <Columns data={weeks} height={110} highlight={weeks[weeks.length - 1]?.key} />
            </div>
          </Card>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHead title="Instagram DM" subtitle={plural(m.igC + m.igS, "lead via DM", "leads via DM")} />
            <div className="px-5 pb-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="tabular font-display text-3xl font-semibold text-[#d6336c]">{m.igC}</p>
                  <p className="text-[13px] text-ink-3">de comentários</p>
                </div>
                <div>
                  <p className="tabular font-display text-3xl font-semibold text-[#8b5cf6]">{m.igS}</p>
                  <p className="text-[13px] text-ink-3">de anúncio ou seguidor</p>
                </div>
              </div>
              <SplitBar parts={[{ value: m.igC, color: "#d6336c" }, { value: m.igS, color: "#8b5cf6" }]} />
            </div>
          </Card>

          <Card>
            <CardHead title="WhatsApp e indicação" subtitle="Canais fora do Instagram" />
            <div className="space-y-2 px-5 pb-5">
              <div className="flex items-center justify-between rounded-xl bg-ok-soft px-3.5 py-2.5">
                <span className="text-[13.5px] font-semibold text-ok">WhatsApp</span>
                <span className="tabular font-display text-2xl font-semibold text-ok">{m.wpp}</span>
              </div>
              {m.frio.map(({ k, n }) => {
                const o = origin(k);
                return (
                  <div key={k} className="flex items-center justify-between px-1 py-1 text-[13.5px]">
                    <span className="flex items-center gap-2 text-ink-2"><o.icon className="size-4" style={{ color: o.color }} />{o.label}</span>
                    <span className="tabular font-semibold text-ink">{n}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHead title="Qualidade do lead" subtitle="Veterinários contra o resto do tráfego" />
            <div className="px-5 pb-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="tabular font-display text-3xl font-semibold text-sky">{m.vetPct}%</p>
                  <p className="text-[13px] text-ink-3">{plural(m.vet, "veterinário", "veterinários")}</p>
                </div>
                <div className="text-right">
                  <p className="tabular font-display text-3xl font-semibold text-coral">{m.total ? 100 - m.vetPct : 0}%</p>
                  <p className="text-[13px] text-ink-3">tráfego sujo ({m.nonVet})</p>
                </div>
              </div>
              <SplitBar parts={[{ value: m.vet, color: "var(--sky)" }, { value: m.nonVet, color: "var(--coral)" }]} />
              {m.total > 0 && <p className="mt-2.5 text-[12.5px] text-ink-3">{m.vetPct >= 60 ? "Tráfego saudável: 60% ou mais de veterinários." : "Abaixo de 60% de veterinários. Vale revisar a segmentação dos anúncios."}</p>}
            </div>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="Leads por funil" subtitle="Funis operacionais (sem planilha, gestores e autônomos)" />
            <div className="px-5 pb-5">
              <HBars items={m.byFunnel.map(({ f, n }) => ({ key: f.id, label: <>{f.icon} {f.name}</>, value: n, color: f.color }))} empty="Nenhum funil operacional" />
            </div>
          </Card>
          <Card>
            <CardHead title="Origem dos leads" />
            <div className="px-5 pb-5">
              <HBars items={m.byOrigin.map(({ k, n }) => ({ key: k, label: origin(k).label, value: n, color: origin(k).color }))} />
            </div>
          </Card>
        </div>

        <Card>
          <CardHead title="Entraram por último">
            <Link href="/leads" className="flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">Ver todos <ArrowUpRight className="size-4" /></Link>
          </CardHead>
          {m.recent.length ? <LeadTable leads={m.recent} actions={false} /> : <Empty title="Nenhum lead no período" />}
        </Card>
      </PageBody>
    </>
  );
}
