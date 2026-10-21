"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Cable, CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCRM, type EloSyncSummary } from "@/lib/store";
import { prepareLead } from "@/lib/elo";
import { SETTING } from "@/lib/config";
import { plural } from "@/lib/utils";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useCadencias } from "./esteira";
import { Notice } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export function EloDialog({ leadIds }: { leadIds: string[] }) {
  const { leads, funnels, settings, syncToElo, setDialog, toast } = useCRM();
  const [extra, setExtra] = useState(settings[SETTING.eloEtiqueta] ?? "");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<EloSyncSummary | null>(null);
  const { lista: cadencias, erro: erroCad } = useCadencias();
  const [cadencia, setCadencia] = useState(settings[SETTING.eloCadencia] ?? "");
  const [zerar, setZerar] = useState(false);
  const extraTags = useMemo(() => extra.split(",").map((s) => s.trim()).filter(Boolean), [extra]);

  const prep = useMemo(() => {
    const ls = leadIds.map((id) => leads.find((l) => l.id === id)).filter((l) => !!l);
    return ls.map((l) => prepareLead(l!, funnels, extraTags));
  }, [leadIds, leads, funnels, extraTags]);
  const ok = prep.filter((p) => p.ok);
  const bad = prep.flatMap((p) => (p.ok ? [] : [p]));
  const sample = ok[0]?.ok ? ok[0].contact : null;
  const running = !!progress && !result;

  async function send() {
    setProgress({ done: 0, total: ok.length });
    const s = await syncToElo(leadIds, extraTags, (done, total) => setProgress({ done, total }), cadencia ? { nome: cadencia, zerar } : undefined);
    setResult(s);
    if (s.enviados) toast(`${plural(s.enviados, "contato enviado", "contatos enviados")} ao Elo`);
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal
      open
      onOpenChange={(v) => !v && !running && setDialog(null)}
      size="md"
      title={leadIds.length === 1 ? "Enviar lead ao Elo" : "Enviar leads ao Elo"}
      description="Cria o contato no Elo ou atualiza o que já existe com o mesmo telefone. Nenhuma mensagem é enviada."
      footer={
        result ? (
          <Button onClick={() => setDialog(null)}>Concluir</Button>
        ) : (
          <>
            <Button variant="ghost" disabled={running} onClick={() => setDialog(null)}>Cancelar</Button>
            <Button disabled={running || ok.length === 0} onClick={() => void send()}>
              {running ? <Loader2 className="animate-spin" /> : <Cable />} Enviar {ok.length > 1 ? `${ok.length} contatos` : "contato"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 pb-2">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 rounded-2xl bg-brand-soft p-4">
            <CircleCheck className="size-8 text-brand" />
            <div>
              <p className="font-display text-xl font-semibold text-ink">{plural(result.enviados, "contato no Elo", "contatos no Elo")}</p>
              <p className="text-[13px] text-ink-2">Os leads enviados ganharam a tag “elo” e um registro no histórico.</p>
            </div>
          </motion.div>
          {result.falhas.length > 0 && (
            <div className="rounded-xl border border-coral/30 bg-coral-soft/50 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-coral"><CircleAlert className="size-4" /> {plural(result.falhas.length, "falha", "falhas")}</p>
              <ul className="scroll-thin max-h-32 space-y-1 overflow-y-auto text-[13px] text-ink-2">
                {result.falhas.map((f) => <li key={f.crmId}><b className="font-semibold text-ink">{f.nome}</b>: {f.erro}</li>)}
              </ul>
            </div>
          )}
          {result.ignorados.length > 0 && <p className="text-[13px] text-ink-3">{plural(result.ignorados.length, "lead ficou de fora", "leads ficaram de fora")} por falta de telefone válido.</p>}
        </div>
      ) : (
        <div className="space-y-4 pb-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-brand-soft p-3">
              <p className="tabular font-display text-2xl font-semibold text-brand-strong">{ok.length}</p>
              <p className="text-[13px] text-ink-2">prontos para enviar</p>
            </div>
            <div className="rounded-xl bg-sunken p-3">
              <p className="tabular font-display text-2xl font-semibold text-ink-2">{bad.length}</p>
              <p className="text-[13px] text-ink-3">sem telefone válido</p>
            </div>
          </div>

          {running && (
            <div>
              <div className="mb-1 flex justify-between text-[13px] text-ink-2"><span>Enviando…</span><span className="tabular">{progress!.done} de {progress!.total}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-sunken">
                <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${pct}%` }} transition={{ ease: "easeOut" }} />
              </div>
            </div>
          )}

          <Field
            label="Cadência de follow-up no Elo"
            hint={erroCad ? `Não foi possível carregar as cadências: ${erroCad}` : "O Elo passa a contar os contatos e avisa o CRM. Quem já está nessa cadência não é reiniciado."}
          >
            <Select value={cadencia} onChange={(e) => setCadencia(e.target.value)} disabled={running || !cadencias}>
              <option value="">{cadencias ? "Sem cadência (só cadastrar)" : "Carregando…"}</option>
              {cadencias?.map((c) => (
                <option key={c.id} value={c.nome}>{c.nome} · {c.total_contatos} contatos, {c.intervalo_dias === 1 ? "todo dia" : `a cada ${c.intervalo_dias} dias`}</option>
              ))}
            </Select>
          </Field>
          {cadencia && (
            <label className="-mt-2 flex items-center gap-2 text-[13px] text-ink-2">
              <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={zerar} onChange={(e) => setZerar(e.target.checked)} disabled={running} />
              Começar a contagem do zero (ignora contatos já feitos com a pessoa)
            </label>
          )}

          <Field label="Etiqueta extra no Elo" hint="Opcional. Ex.: SDR outubro. Separe várias por vírgula. Serve para filtrar transmissões e quadros no Elo.">
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="SDR outubro" disabled={running} />
          </Field>

          {sample && (
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[12.5px] font-semibold text-ink-3">Como {leadIds.length > 1 ? "o primeiro" : "o contato"} chega no Elo</p>
              <p className="text-sm font-semibold text-ink">{sample.nome} <span className="tabular font-normal text-ink-3">+{sample.telefone}</span></p>
              <div className="mt-2 flex flex-wrap gap-1">{sample.etiquetas.map((t) => <Chip key={t} color="var(--brand)">{t}</Chip>)}</div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12.5px]">
                {Object.entries(sample.campos).filter(([k]) => k !== "crm_id").map(([k, v]) => (
                  <div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="truncate text-ink-2">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}

          {bad.length > 0 && (
            <details className="rounded-xl bg-surface-2 p-3 text-[13px]">
              <summary className="cursor-pointer font-semibold text-ink-2">Ver quem fica de fora ({bad.length})</summary>
              <ul className="scroll-thin mt-2 max-h-32 space-y-0.5 overflow-y-auto text-ink-3">
                {bad.map((b) => <li key={b.crmId}>{b.nome}: {b.motivo}</li>)}
              </ul>
            </details>
          )}

          <Notice tone="info">
            Importar não inicia conversa. No número de QR Code, o Elo só faz transmissão para quem já conversou com vocês. A primeira mensagem para lead frio continua individual (tela <Link href="/abordagem" className="font-semibold underline" onClick={() => setDialog(null)}>Abordagem</Link>).
          </Notice>
        </div>
      )}
    </Modal>
  );
}
