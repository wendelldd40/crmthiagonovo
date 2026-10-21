"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cable, CircleCheck, Kanban, Loader2, TriangleAlert } from "lucide-react";
import type { Funnel, Lead } from "@/lib/types";
import type { Destino } from "@/lib/importacao";
import type { EloSyncSummary } from "@/lib/store";
import { useCRM } from "@/lib/store";
import { plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Notice } from "@/components/ui/card";

/** Funil sugerido: um de prospecção, se existir; senão o primeiro. */
export function funilPadrao(funnels: Funnel[], preferir: RegExp) {
  return funnels.find((f) => preferir.test(f.name)) ?? funnels[0];
}

export function destinoInicial(funnels: Funnel[], origin: string, preferir: RegExp): Destino {
  const f = funilPadrao(funnels, preferir);
  return { funnelId: f?.id ?? "", stageId: f?.stages[0]?.id ?? "", origin, prospeccao: true, etiquetas: [] };
}

/** Onde os leads entram: funil, etapa, lista de prospecção e etiquetas. */
export function DestinoCampos({ value, onChange }: { value: Destino; onChange: (d: Destino) => void }) {
  const { funnels } = useCRM();
  const [etq, setEtq] = useState(value.etiquetas.join(", "));
  const f = funnels.find((x) => x.id === value.funnelId);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Funil">
        <Select value={value.funnelId} onChange={(e) => {
          const nf = funnels.find((x) => x.id === e.target.value);
          onChange({ ...value, funnelId: e.target.value, stageId: nf?.stages[0]?.id ?? "" });
        }}>
          {funnels.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
        </Select>
      </Field>
      <Field label="Etapa">
        <Select value={value.stageId} onChange={(e) => onChange({ ...value, stageId: e.target.value })} disabled={!f}>
          {f?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Etiquetas extras" hint="Separe por vírgula. A cidade entra sozinha.">
        <Input value={etq} placeholder="ex.: campanha outubro" onChange={(e) => { setEtq(e.target.value); onChange({ ...value, etiquetas: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }); }} />
      </Field>
      <Field label="Lista de prospecção" hint="Fica fora das métricas do Painel e aparece na Abordagem.">
        <label className="flex h-10 items-center gap-2.5 text-[13.5px] text-ink-2">
          <Switch checked={value.prospeccao} onCheckedChange={(v) => onChange({ ...value, prospeccao: v })} /> {value.prospeccao ? "Sim (etiqueta planilha)" : "Não, contar como lead"}
        </label>
      </Field>
    </div>
  );
}

export interface ResultadoImport { criados: Lead[]; erro?: string; elo?: EloSyncSummary }

/** Barra de importação + resumo do que aconteceu. */
export function BarraImportar({ total, destino, rotulo, onImportar }: {
  total: number;
  destino: Destino;
  rotulo: string;
  onImportar: (progresso: (feitos: number, total: number) => void) => Promise<ResultadoImport | null>;
}) {
  const { funnels, setDialog, setActiveFunnelId, canEdit, can } = useCRM();
  const router = useRouter();
  const [prog, setProg] = useState<{ feitos: number; total: number } | null>(null);
  const [res, setRes] = useState<ResultadoImport | null>(null);
  const f = funnels.find((x) => x.id === destino.funnelId);
  const etapa = f?.stages.find((s) => s.id === destino.stageId);

  async function importar() {
    setRes(null);
    setProg({ feitos: 0, total });
    const r = await onImportar((feitos, t) => setProg({ feitos, total: t }));
    setProg(null);
    setRes(r);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3.5">
        <p className="min-w-[200px] flex-1 text-[14px] text-ink-2">
          <b className="tabular font-display text-xl font-semibold text-ink">{total}</b> {total === 1 ? "lead selecionado" : "leads selecionados"}
          {f && <> para <b className="text-ink">{f.name}</b>{etapa && <> · {etapa.name}</>}</>}
        </p>
        <Button disabled={!total || !destino.funnelId || !canEdit || !!prog} onClick={() => void importar()}>
          {prog ? <><Loader2 className="animate-spin" /> Importando {prog.feitos}/{prog.total}</> : rotulo}
        </Button>
      </div>
      {res && (
        res.erro && !res.criados.length ? (
          <Notice tone="coral"><TriangleAlert className="mr-1.5 inline size-4" />{res.erro}</Notice>
        ) : (
          <Notice tone="brand">
            <p className="flex items-center gap-1.5 font-semibold"><CircleCheck className="size-4" /> {plural(res.criados.length, "lead importado", "leads importados")}{f ? ` em ${f.name}` : ""}.</p>
            {res.erro && <p className="mt-1 text-coral">{res.erro}</p>}
            {res.elo && <p className="mt-1">Elo: {plural(res.elo.enviados, "enviado", "enviados")}{res.elo.falhas.length ? `, ${res.elo.falhas.length} com erro (${res.elo.falhas[0].erro})` : ""}{res.elo.ignorados.length ? `, ${res.elo.ignorados.length} sem WhatsApp válido` : ""}.</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => { if (f) setActiveFunnelId(f.id); router.push("/kanban"); }}><Kanban /> Ver no Kanban</Button>
              {!res.elo && can("elo") && res.criados.some((l) => l.phone) && (
                <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "elo", leadIds: res.criados.filter((l) => l.phone).map((l) => l.id) })}><Cable /> Enviar ao Elo</Button>
              )}
            </div>
          </Notice>
        )
      )}
    </div>
  );
}
