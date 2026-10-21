"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, ChartLine, ExternalLink, NotebookPen, Palette, Search, Smartphone } from "lucide-react";
import { useCRM } from "@/lib/store";
import { MONTHS } from "@/lib/constants";
import { isAbordado } from "@/lib/domain";
import { cn, isOp, pct } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHead } from "@/components/ui/card";
import { Columns, SplitBar } from "@/components/charts/bars";
import { CountUp } from "@/components/ui/count-up";

const TOOLS = [
  { icon: CalendarDays, title: "Calendário editorial", desc: "Planejar posts e stories", href: "https://calendar.google.com", color: "#2563eb" },
  { icon: Palette, title: "Canva", desc: "Artes para feed e stories", href: "https://canva.com", color: "#7c3aed" },
  { icon: ChartLine, title: "Meta Business Suite", desc: "Métricas e agendamento", href: "https://business.facebook.com", color: "#1877f2" },
  { icon: NotebookPen, title: "Notion", desc: "Pautas e briefings", href: "https://notion.so", color: "#ea7317" },
  { icon: Search, title: "Google Trends", desc: "Tendências para pauta", href: "https://trends.google.com", color: "#16a34a" },
  { icon: Smartphone, title: "Creator Studio", desc: "Agendar no Instagram", href: "https://business.facebook.com/creatorstudio", color: "#d6336c" },
];

const CHECKLIST = [
  { task: "2 posts no feed (terça e quinta)", type: "Feed" },
  { task: "3 Reels na semana (segunda, quarta e sexta)", type: "Reels" },
  { task: "Stories diários com chamada para a DM", type: "Stories" },
  { task: "Responder todos os comentários em até 2h", type: "Engajamento" },
  { task: "Ver as métricas da semana anterior", type: "Análise" },
  { task: "Checar leads novos captados pelo ManyChat", type: "Leads" },
  { task: "Interagir com 10 perfis do público veterinário", type: "Prospecção" },
];

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `crm-checklist-${d.getFullYear()}-${w}`;
}

export default function MarketingPage() {
  const { leads } = useCRM();
  const [checked, setChecked] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(weekKey()) || "[]");
    } catch {
      return [];
    }
  });
  function toggle(i: number) {
    setChecked((c) => {
      const n = c.includes(i) ? c.filter((x) => x !== i) : [...c, i];
      try {
        localStorage.setItem(weekKey(), JSON.stringify(n));
      } catch {}
      return n;
    });
  }

  const m = useMemo(() => {
    const op = leads.filter(isOp);
    const igC = op.filter((l) => l.origin === "ig_comentario").length;
    const igS = op.filter((l) => l.origin === "ig_seguidor").length;
    const ig = igC + igS;
    const abord = leads.filter(isAbordado).length;
    const conv = op.filter((l) => l.converted).length;
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: MONTHS[d.getMonth()], value: op.filter((l) => l.date.startsWith(key)).length };
    });
    return { ig, igC, igS, abord, conv, rate: pct(conv, ig), months };
  }, [leads]);

  const funnel = [
    { l: "Captados no Instagram", v: m.ig, c: "#d6336c" },
    { l: "Abordados no WhatsApp", v: m.abord, c: "#16a34a" },
    { l: "Viraram clientes", v: m.conv, c: "var(--brand)" },
  ];
  const fmax = Math.max(1, ...funnel.map((f) => f.v));

  return (
    <>
      <PageHeader title="Marketing" subtitle="Captação pelo Instagram e rotina de conteúdo" />
      <PageBody className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHead title="Do Instagram ao contrato" subtitle={`Clientes divididos pelos leads do Instagram: ${m.rate}%`} />
            <div className="space-y-3 px-5 pb-5">
              {funnel.map((f, i) => (
                <div key={f.l}>
                  <div className="mb-1 flex items-baseline justify-between text-[13.5px]">
                    <span className="text-ink-2">{f.l}</span>
                    <CountUp value={f.v} className="tabular font-display text-xl font-semibold text-ink" />
                  </div>
                  <div className="h-7 overflow-hidden rounded-lg bg-sunken">
                    <motion.div className="h-full rounded-lg" style={{ background: f.c }} initial={{ width: 0 }} animate={{ width: `${(f.v / fmax) * 100}%` }} transition={{ delay: i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="De onde vem o lead do Instagram" />
            <div className="px-5 pb-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div><p className="tabular font-display text-4xl font-semibold text-[#d6336c]">{m.igC}</p><p className="text-[13px] text-ink-3">comentários</p></div>
                <div><p className="tabular font-display text-4xl font-semibold text-[#8b5cf6]">{m.igS}</p><p className="text-[13px] text-ink-3">anúncio ou seguidor</p></div>
              </div>
              <SplitBar parts={[{ value: m.igC, color: "#d6336c" }, { value: m.igS, color: "#8b5cf6" }]} />
              <p className="mt-6 mb-2 text-[13px] font-semibold text-ink-2">Leads por mês (sem planilha)</p>
              <Columns data={m.months} height={110} highlight={m.months[5].key} />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="Checklist da semana" subtitle={`${checked.length} de ${CHECKLIST.length} feitos · zera toda semana, fica só neste navegador`} />
            <ul className="px-3 pb-3">
              {CHECKLIST.map((c, i) => {
                const on = checked.includes(i);
                return (
                  <li key={c.task}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                      <input type="checkbox" checked={on} onChange={() => toggle(i)} className="size-4 accent-[var(--brand)]" />
                      <span className={cn("flex-1 text-[14px]", on ? "text-ink-3 line-through" : "text-ink")}>{c.task}</span>
                      <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] font-medium text-ink-3">{c.type}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHead title="Ferramentas" />
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <a key={t.title} href={t.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-line-strong hover:bg-surface-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${t.color} 14%, transparent)`, color: t.color }}><t.icon className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-ink">{t.title}</span><span className="block truncate text-[12px] text-ink-3">{t.desc}</span></span>
                  <ExternalLink className="size-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
