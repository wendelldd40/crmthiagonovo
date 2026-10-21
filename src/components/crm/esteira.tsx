"use client";
/* Esteira do Elo dentro do CRM: selo no cartão, seção no painel do lead e registro de ligação. */
import { useEffect, useState } from "react";
import { Loader2, MessageCircleReply, Phone } from "lucide-react";
import { backend, useCRM } from "@/lib/store";
import { IS_DEMO } from "@/lib/config";
import { tipoLabel } from "@/lib/esteira";
import type { Lead } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Tip } from "@/components/ui/tooltip";

export interface CadenciaElo { id: string; nome: string; intervalo_dias: number; total_contatos: number }

/** Cadências do Elo (busca uma vez por sessão). */
let cache: Promise<CadenciaElo[]> | null = null;
export function useCadencias() {
  const [lista, setLista] = useState<CadenciaElo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    cache ??= (async () => {
      const token = await backend.accessToken();
      const res = await fetch("/api/elo/cadencias", { headers: { authorization: `Bearer ${token ?? ""}`, "x-crm-demo": IS_DEMO ? "1" : "0" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.erro || `Erro ${res.status}`);
      return body as CadenciaElo[];
    })();
    cache.then((l) => vivo && setLista(l)).catch((e) => {
      cache = null;
      if (vivo) {
        setErro(e instanceof Error ? e.message : "Erro");
        setLista([]);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);
  return { lista, erro };
}

/** Barrinha segmentada "3/12". */
export function EsteiraBarra({ feitos, total, className }: { feitos: number; total: number | null; className?: string }) {
  if (!total) return <span className={cn("tabular text-[12.5px] font-semibold", className)}>{feitos} {feitos === 1 ? "contato" : "contatos"}</span>;
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-1.5 flex-1 gap-[2px]">
        {Array.from({ length: Math.min(total, 30) }, (_, i) => (
          <span key={i} className={cn("h-full flex-1 rounded-[2px]", i < feitos ? "bg-[#1fa855]" : "bg-sunken")} />
        ))}
      </span>
      <span className="tabular shrink-0 text-[12px] font-bold text-ink">{feitos}/{total}</span>
    </span>
  );
}

/** Selo compacto para cartão do Kanban e tabela. */
export function EsteiraSelo({ lead }: { lead: Lead }) {
  const e = lead.elo;
  if (!e || (!e.contatos && !e.cadencia)) return null;
  const label = `${e.contatos}${e.total ? `/${e.total}` : ""}`;
  const dica = `${e.cadencia ?? "Sem cadência"} · ${e.contatos} ${e.contatos === 1 ? "contato" : "contatos"}${e.ultimoContato ? `, último em ${fmtDate(e.ultimoContato)}${e.ultimoTipo ? ` (${tipoLabel(e.ultimoTipo)})` : ""}` : ""}${e.respostas ? ` · respondeu em ${e.respostas} ${e.respostas === 1 ? "dia" : "dias"}` : ""}`;
  return (
    <Tip label={dica}>
      <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[11.5px] font-bold", e.status === "concluida" ? "bg-sunken text-ink-2" : "bg-[#1fa855]/12 text-[#178a45] dark:text-[#4cc983]")}>
        <MessageCircleReply className="size-3" />
        {label}
        {e.respostas > 0 && <span className="ml-0.5 size-1.5 rounded-full bg-sky" aria-label="respondeu" />}
      </span>
    </Tip>
  );
}

export function LigacaoModal({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { registrarLigacao } = useCRM();
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Registrar ligação"
      description={`${lead.name} · conta como contato de hoje na esteira do Elo`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await registrarLigacao(lead.id, nota.trim());
              setBusy(false);
              if (ok) {
                setNota("");
                onOpenChange(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Phone />} Registrar
          </Button>
        </>
      }
    >
      <Field label="Como foi? (opcional)" hint="O WhatsApp não avisa ligações que nós fazemos. Sem este registro, ela não entra na contagem.">
        <Input autoFocus value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: atendeu, pediu proposta" maxLength={400} />
      </Field>
    </Modal>
  );
}

/** Seção do painel do lead. */
export function EsteiraSecao({ lead }: { lead: Lead }) {
  const { canEdit, can } = useCRM();
  const [ligar, setLigar] = useState(false);
  const e = lead.elo;
  const noElo = lead.tags.includes("elo");
  if (!e && !noElo) return null;
  return (
    <section className="border-t border-line px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[12.5px] font-semibold text-ink-3">Esteira no Elo{e?.cadencia ? ` · ${e.cadencia}` : ""}</h3>
        {canEdit && can("elo") && lead.phone && (
          <Button size="xs" variant="secondary" onClick={() => setLigar(true)}><Phone /> Registrar ligação</Button>
        )}
      </div>
      {e ? (
        <>
          <EsteiraBarra feitos={e.contatos} total={e.total} />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
            <div className="rounded-lg bg-surface-2 px-2.5 py-1.5"><dt className="text-ink-3">Último</dt><dd className="font-semibold text-ink">{fmtDate(e.ultimoContato)}</dd><dd className="truncate text-[11.5px] text-ink-3">{tipoLabel(e.ultimoTipo) || "—"}</dd></div>
            <div className="rounded-lg bg-surface-2 px-2.5 py-1.5"><dt className="text-ink-3">Respostas</dt><dd className="font-semibold text-sky">{e.respostas} {e.respostas === 1 ? "dia" : "dias"}</dd><dd className="text-[11.5px] text-ink-3">{e.ultimaResposta ? `última ${fmtDate(e.ultimaResposta)}` : "nenhuma"}</dd></div>
            <div className="rounded-lg bg-surface-2 px-2.5 py-1.5"><dt className="text-ink-3">Situação</dt><dd className="font-semibold text-ink">{e.status === "ativa" ? "Em andamento" : e.status === "concluida" ? "Concluída" : e.status === "pausada" ? "Pausada" : "Sem cadência"}</dd><dd className="text-[11.5px] text-ink-3">{e.status === "ativa" && lead.followUp ? `próximo ${fmtDate(lead.followUp)}` : ""}</dd></div>
          </dl>
        </>
      ) : (
        <p className="text-[13px] text-ink-3">Enviado ao Elo. A contagem aparece aqui depois do primeiro contato ou quando entrar numa cadência.</p>
      )}
      <LigacaoModal lead={lead} open={ligar} onOpenChange={setLigar} />
    </section>
  );
}
