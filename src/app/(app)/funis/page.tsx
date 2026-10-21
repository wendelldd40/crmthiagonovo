"use client";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Kanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useCRM } from "@/lib/store";
import { isClosed } from "@/lib/domain";
import { fmtMoneyCompact, pct, plural } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tip } from "@/components/ui/tooltip";

export default function FunisPage() {
  const { funnels, leads, setDialog, setActiveFunnelId, confirm, deleteFunnel, canEdit } = useCRM();
  const router = useRouter();

  return (
    <>
      <PageHeader title="Funis de venda" subtitle="Cada funil tem suas etapas. A última etapa conta como fechamento.">
        {canEdit && <Button size="sm" onClick={() => setDialog({ kind: "funnel" })}><Plus /> Novo funil</Button>}
      </PageHeader>
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {funnels.map((f, i) => {
            const fl = leads.filter((l) => l.funnelId === f.id);
            const closed = fl.filter((l) => isClosed(l, funnels));
            const val = fl.reduce((s, l) => s + (l.value || 0), 0);
            const max = Math.max(1, ...f.stages.map((s) => fl.filter((l) => l.stageId === s.id).length));
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <div className="flex items-start gap-3 px-5 pt-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `color-mix(in oklab, ${f.color} 16%, transparent)` }}>{f.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[17px] font-semibold tracking-tight text-ink">{f.name}</h2>
                      <p className="text-[13px] text-ink-3">{plural(f.stages.length, "etapa", "etapas")} · {plural(fl.length, "lead", "leads")}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-0.5">
                        <Tip label="Editar funil"><Button size="icon-xs" variant="ghost" onClick={() => setDialog({ kind: "funnel", funnelId: f.id })} aria-label="Editar funil"><Pencil /></Button></Tip>
                        <Tip label="Excluir funil">
                          <Button
                            size="icon-xs"
                            variant="danger-ghost"
                            aria-label="Excluir funil"
                            onClick={() => confirm("Excluir funil", `“${f.name}” será excluído junto com ${plural(fl.length, "lead", "leads")} e todo o histórico deles. Não dá para desfazer.`, `Excluir funil e ${plural(fl.length, "lead", "leads")}`, () => deleteFunnel(f.id))}
                          >
                            <Trash2 />
                          </Button>
                        </Tip>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 px-5 py-4">
                    <div><p className="tabular font-display text-2xl font-semibold text-ink">{fl.length}</p><p className="text-xs text-ink-3">leads</p></div>
                    <div><p className="tabular font-display text-2xl font-semibold text-ok">{pct(closed.length, fl.length)}%</p><p className="text-xs text-ink-3">fechamento</p></div>
                    <div><p className="tabular font-display text-2xl font-semibold text-brand-strong">{fmtMoneyCompact(val)}</p><p className="text-xs text-ink-3">pipeline</p></div>
                  </div>

                  <ul className="flex-1 space-y-1.5 px-5 pb-4">
                    {f.stages.map((s) => {
                      const n = fl.filter((l) => l.stageId === s.id).length;
                      return (
                        <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
                          <span className="w-28 shrink-0 truncate text-ink-2">{s.name}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                            <motion.span className="block h-full rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                          </span>
                          <span className="tabular w-7 text-right font-semibold text-ink">{n}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => {
                      setActiveFunnelId(f.id);
                      router.push("/kanban");
                    }}
                    className="flex items-center justify-center gap-2 border-t border-line py-3 text-[13px] font-semibold text-brand transition-colors hover:bg-surface-2"
                  >
                    <Kanban className="size-4" /> Abrir no Kanban
                  </button>
                </Card>
              </motion.div>
            );
          })}
          {canEdit && (
            <button onClick={() => setDialog({ kind: "funnel" })} className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-strong text-ink-3 transition-colors hover:border-brand hover:text-brand">
              <Plus className="mb-2 size-7" />
              <span className="font-semibold">Criar funil</span>
              <span className="mt-0.5 text-[13px]">Com etapas do seu jeito</span>
            </button>
          )}
        </div>
      </PageBody>
    </>
  );
}
