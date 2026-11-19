"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarCheck2, Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { IS_DEMO } from "@/lib/config";
import { copyText } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Estado {
  ligado: boolean;
  ok?: boolean;
  nome?: string;
  erro?: string;
  conta?: string;
  calendario?: string;
}

/**
 * Estado da ligação direta com o Google Agenda.
 *
 * Diferente do endereço assinado (que o Google só relê de 12 em 12 horas), aqui o
 * CRM escreve no calendário na hora. Quem configura é quem tem acesso à Vercel,
 * por isso esta tela mostra o passo a passo e o diagnóstico do que falta.
 */
export function LigacaoGoogle() {
  const [e, setE] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(!IS_DEMO);
  const [passos, setPassos] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // mesmo padrão das cadências do Elo: a promessa nasce no efeito e o estado só muda no .then,
  // nunca no caminho síncrono — é o que evita render em cascata.
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (IS_DEMO) return;
    let vivo = true;
    fetch("/api/agenda/google")
      .then((r) => r.json())
      .then((j: Estado) => vivo && setE(j))
      .catch(() => vivo && setE({ ligado: false }))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const checar = useCallback(() => {
    setCarregando(true);
    setTentativa((n) => n + 1);
  }, []);

  if (IS_DEMO) {
    return (
      <Bloco tom="neutro" titulo="Google Agenda na hora">
        <p className="text-[13px] text-ink-3">
          No modo demonstração a ligação com o Google fica desligada. Com o CRM no ar ela grava os compromissos direto no calendário da equipe — na hora, sem esperar o Google reler nada.
        </p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setPassos((v) => !v)}>
          {passos ? "Esconder" : "Ver o passo a passo"}
        </Button>
        {passos && <Passos copiado={copiado} setCopiado={setCopiado} />}
      </Bloco>
    );
  }

  if (carregando) {
    return (
      <Bloco tom="neutro" titulo="Google Agenda na hora">
        <p className="flex items-center gap-2 text-[13px] text-ink-3"><Loader2 className="size-4 animate-spin" /> Conferindo a ligação…</p>
      </Bloco>
    );
  }

  /* ligado e funcionando */
  if (e?.ligado && e.ok) {
    return (
      <Bloco tom="ok" titulo="Google Agenda ligado">
        <p className="text-[13px] text-ink-2">
          Os compromissos entram no calendário <strong className="text-ink">{e.nome || "da equipe"}</strong> assim que você marca — e mudam de horário, de situação ou somem junto com o CRM.
        </p>
        <p className="mt-1.5 text-xs text-ink-3">Quem tiver esse calendário compartilhado vê tudo na hora, inclusive no iPhone com a conta Google ligada.</p>
      </Bloco>
    );
  }

  /* configurado mas com erro */
  if (e?.ligado && !e.ok) {
    return (
      <Bloco tom="erro" titulo="Google Agenda com problema">
        <p className="text-[13px] text-ink-2">{e.erro}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={checar}><RefreshCw /> Conferir de novo</Button>
          <Button size="sm" variant="ghost" onClick={() => setPassos((v) => !v)}>Ver o passo a passo</Button>
        </div>
        {passos && <Passos conta={e.conta} copiado={copiado} setCopiado={setCopiado} />}
      </Bloco>
    );
  }

  /* nunca configurado */
  return (
    <Bloco tom="neutro" titulo="Google Agenda na hora">
      <p className="text-[13px] text-ink-3">
        Do jeito assinado abaixo, o Google só relê a agenda a cada 12 ou 24 horas — limite do próprio Google, não dá para acelerar.
        Ligando o CRM direto ao calendário, o compromisso aparece na hora para todo mundo. Configura uma vez, leva uns 10 minutos.
      </p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => setPassos((v) => !v)}>
        {passos ? "Esconder" : "Como ligar"}
      </Button>
      {passos && <Passos copiado={copiado} setCopiado={setCopiado} />}
    </Bloco>
  );
}

function Bloco({ tom, titulo, children }: { tom: "ok" | "erro" | "neutro"; titulo: string; children: React.ReactNode }) {
  const cor = tom === "ok" ? "var(--ok)" : tom === "erro" ? "var(--coral)" : "var(--ink-3)";
  const Icon = tom === "ok" ? CalendarCheck2 : tom === "erro" ? AlertTriangle : CalendarCheck2;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: `color-mix(in oklab, ${cor} 35%, transparent)`, background: `color-mix(in oklab, ${cor} 7%, transparent)` }}
    >
      <p className="mb-1.5 flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <Icon className="size-4" style={{ color: cor }} /> {titulo}
      </p>
      {children}
    </div>
  );
}

const VARS = `GOOGLE_SA_EMAIL
GOOGLE_SA_PRIVATE_KEY
GOOGLE_CALENDAR_ID`;

function Passos({ conta, copiado, setCopiado }: { conta?: string; copiado: boolean; setCopiado: (v: boolean) => void }) {
  return (
    <ol className="mt-3 space-y-2.5 border-t border-line pt-3 text-[13px] text-ink-2">
      <Passo n={1}>
        No <a className="font-medium text-brand-strong underline decoration-line-strong underline-offset-2" href="https://calendar.google.com" target="_blank" rel="noreferrer">Google Agenda <ExternalLink className="inline size-3" /></a>, crie um calendário novo chamado <strong>ThiagoCRM · Agenda</strong>. É nele que o CRM vai escrever — não use o calendário pessoal.
      </Passo>
      <Passo n={2}>
        No <a className="font-medium text-brand-strong underline decoration-line-strong underline-offset-2" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud <ExternalLink className="inline size-3" /></a>: crie um projeto → ative a <strong>Google Calendar API</strong> → <strong>Credenciais → Criar → Conta de serviço</strong> → nela, <strong>Chaves → Adicionar chave → JSON</strong>. Baixa um arquivo.
      </Passo>
      <Passo n={3}>
        De volta ao calendário: <strong>Configurações → Compartilhar com pessoas específicas → Adicionar</strong>, cole o e-mail da conta de serviço {conta ? <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[11.5px] text-ink-2">{conta}</code> : "(termina em .iam.gserviceaccount.com)"} e escolha <strong>Fazer alterações nos eventos</strong>.
      </Passo>
      <Passo n={4}>
        Na Vercel do CRM, em <strong>Settings → Environment Variables</strong>, cadastre as três:
        <span className="mt-1.5 flex items-start gap-2">
          <code className="flex-1 rounded bg-sunken px-2 py-1.5 font-mono text-[11.5px] leading-relaxed text-ink-2 whitespace-pre-line">{VARS}</code>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Copiar nomes das variáveis"
            onClick={async () => {
              await copyText(VARS);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            }}
          >
            {copiado ? <Check className="text-ok" /> : <Copy />}
          </Button>
        </span>
        <span className="mt-1 block text-xs text-ink-3">
          O e-mail e a chave (<code className="rounded bg-sunken px-1 py-0.5 font-mono text-[11.5px] text-ink-2">private_key</code>, inteira, com BEGIN e END) estão no JSON. O id do calendário está em Configurações do calendário → <strong>Integrar agenda</strong>.
        </span>
      </Passo>
      <Passo n={5}>
        Redeploy na Vercel. Depois compartilhe o mesmo calendário com cada pessoa da equipe — aí todo mundo vê, e quem usa iPhone com a conta Google ligada vê por lá também.
      </Passo>
    </ol>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-strong">{n}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
