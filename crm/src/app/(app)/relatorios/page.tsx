"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useCRM } from "@/lib/store";
import { MONTHS, ORIGINS, origin } from "@/lib/constants";
import { isClosed } from "@/lib/domain";
import { fmtMoney, fmtMoneyCompact, isOp, pct } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHead } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { CountUp } from "@/components/ui/count-up";
import { Columns, HBars } from "@/components/charts/bars";

export default function RelatoriosPage() {
  const { leads, funnels } = useCRM();
  const [scope, setScope] = useState<"todos" | "op">("todos");
  const base = useMemo(() => (scope === "op" ? leads.filter(isOp) : leads), [leads, scope]);

  const r = useMemo(() => {
    const total = base.reduce((s, l) => s + (l.value || 0), 0);
    const byOrigin = Object.keys(ORIGINS)
      .map((k) => {
        const ls = base.filter((l) => l.origin === k);
        return { k, n: ls.length, val: ls.reduce((s, l) => s + (l.value || 0), 0), conv: ls.filter((l) => l.converted).length };
      })
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n);
    const byFunnel = funnels.map((f) => {
      const fl = base.filter((l) => l.funnelId === f.id);
      const closed = fl.filter((l) => isClosed(l, funnels));
      return { f, n: fl.length, closed: closed.length, val: fl.reduce((s, l) => s + (l.value || 0), 0), rate: pct(closed.length, fl.length) };
    });
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: MONTHS[d.getMonth()], value: base.filter((l) => l.date.startsWith(key)).length, title: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    });
    return { total, byOrigin, byFunnel, months, conv: base.filter((l) => l.converted).length };
  }, [base, funnels]);

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Desempenho por funil, origem e mês de entrada">
        <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: "todos", label: "Todos os leads" }, { value: "op", label: "Sem planilha" }]} />
      </PageHeader>
      <PageBody className="space-y-5">
        <Card className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
          {[
            { l: "Leads", v: base.length, f: undefined },
            { l: "Pipeline total", v: r.total, f: fmtMoneyCompact },
            { l: "Clientes", v: r.conv, f: undefined },
            { l: "Origens ativas", v: r.byOrigin.length, f: undefined },
          ].map((k) => (
            <div key={k.l} className="px-5 py-4">
              <p className="text-[13px] text-ink-3">{k.l}</p>
              <CountUp value={k.v} format={k.f} className="tabular mt-1 block font-display text-3xl font-semibold tracking-tight text-ink" />
            </div>
          ))}
        </Card>

        <Card>
          <CardHead title="Entrada de leads por mês" subtitle="Últimos 12 meses, pela data de entrada" />
          <div className="px-5 pb-5">
            <Columns data={r.months} height={170} highlight={r.months[r.months.length - 1].key} />
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="Desempenho por funil" subtitle="Fechamento = leads na última etapa" />
            <ul className="divide-y divide-line px-5 pb-2">
              {r.byFunnel.map(({ f, n, closed, val, rate }) => (
                <li key={f.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold text-ink">{f.icon} {f.name}</span>
                    <span className="tabular shrink-0 text-[13px] font-semibold text-brand-strong">{fmtMoney(val)}</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-[12.5px] text-ink-3">
                    <span>{n} leads</span>
                    <span>{closed} fechados</span>
                    <span className="font-semibold text-ok">{rate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"><motion.div className="h-full rounded-full" style={{ background: f.color }} initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} /></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHead title="Leads por origem" subtitle="Volume, clientes e valor estimado" />
            <div className="px-5 pb-5">
              <HBars
                items={r.byOrigin.map(({ k, n, val, conv }) => ({
                  key: k,
                  label: origin(k).label,
                  value: n,
                  color: origin(k).color,
                  extra: <span className="tabular text-[12px] text-ink-3">{conv} clientes · {fmtMoneyCompact(val)}</span>,
                }))}
              />
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
