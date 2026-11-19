"use client";
import { useState, useSyncExternalStore } from "react";
import { Apple, Check, Copy, Download, Loader2, Smartphone } from "lucide-react";
import { useCRM } from "@/lib/store";
import { SETTING, IS_DEMO } from "@/lib/config";
import { gerarIcs } from "@/lib/ics";
import { proximosCompromissos } from "@/lib/domain";
import { copyText, uid } from "@/lib/utils";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { LigacaoGoogle } from "./agenda-google";

type Aba = "google" | "iphone" | "outlook";

/**
 * Assinar o feed é o que faz a agenda do CRM aparecer no celular e continuar
 * atualizando sozinha. O token fica em settings; qualquer um da equipe usa o mesmo endereço.
 */
export function SincronizarCelular({ variante = "secondary", rotulo = "Celular" }: { variante?: "primary" | "secondary" | "ghost"; rotulo?: string }) {
  const { agenda, settings, setSetting, canEdit, toast } = useCRM();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>("google");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // o endereço do CRM só existe no navegador; no servidor fica vazio
  const origem = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const token = settings[SETTING.agendaToken] || "";
  const feed = token && origem ? `${origem}/api/agenda/ics?token=${token}` : "";
  const webcal = feed.replace(/^https?:\/\//, "webcal://");
  const googleAdd = feed ? `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(feed)}` : "";

  async function gerar() {
    setGerando(true);
    try {
      await setSetting(SETTING.agendaToken, `${uid()}${uid()}`.replace(/-/g, "").slice(0, 40));
      toast("Endereço da agenda criado");
    } catch {
      /* o store já avisa do erro */
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto: string, qual: string) {
    await copyText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 1800);
  }

  /** Alternativa sem servidor: baixa o que está marcado agora e importa no calendário. */
  function baixarTudo() {
    const itens = proximosCompromissos(agenda, 365);
    const texto = gerarIcs(itens, { nome: "ThiagoCRM · Agenda", urlCrm: `${origem}/agenda` });
    const url = URL.createObjectURL(new Blob([texto], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "thiagocrm-agenda.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${itens.length} compromissos no arquivo`);
  }

  return (
    <>
      <Button size="sm" variant={variante} onClick={() => setAberto(true)}>
        <Smartphone /> {rotulo}
      </Button>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        size="lg"
        title="Agenda no celular"
        description="Duas formas de ver a agenda do CRM no telefone: ligada direto ao Google (na hora) ou assinada por endereço (o telefone busca sozinho)."
      >
        <div className="space-y-4 pb-2">
          <LigacaoGoogle />

          <div className="border-t border-line pt-4">
            <p className="text-[13.5px] font-semibold text-ink">Assinar por endereço</p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              Não precisa de configuração, mas o telefone busca de tempos em tempos: o iPhone a cada hora (dá para baixar para 5 minutos) e o Google a cada 12 ou 24 horas.
            </p>
          </div>

          {!token ? (
            <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center">
              <span className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong"><Smartphone className="size-5" /></span>
              <p className="font-semibold text-ink">Crie o endereço da agenda</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-3">
                É um link secreto que só mostra os compromissos — não dá acesso ao CRM. Todo mundo da equipe usa o mesmo.
              </p>
              {canEdit ? (
                <Button className="mt-4" onClick={() => void gerar()} disabled={gerando}>
                  {gerando && <Loader2 className="animate-spin" />} Criar endereço
                </Button>
              ) : (
                <p className="mt-3 text-[13px] text-ink-3">Peça a quem é admin para criar o endereço.</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Endereço da agenda</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feed}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-sunken px-3 font-mono text-[12.5px] text-ink-2 outline-none"
                  />
                  <Button variant="secondary" onClick={() => void copiar(feed, "feed")}>
                    {copiado === "feed" ? <Check className="text-ok" /> : <Copy />} {copiado === "feed" ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-ink-3">Quem tiver este link vê a agenda. Não poste em grupo aberto.</p>
              </div>

              {IS_DEMO && <Notice tone="amber">No modo demonstração o endereço não responde de verdade — é só para ver como fica. Com o Supabase ligado, ele funciona.</Notice>}

              <Segmented
                value={aba}
                onChange={setAba}
                options={[
                  { value: "google", label: "Android / Google" },
                  { value: "iphone", label: "iPhone" },
                  { value: "outlook", label: "Outlook" },
                ]}
              />

              {aba === "google" && (
                <ol className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  <Passo n={1}>
                    Abra o <strong>Google Agenda no computador</strong> (o app do celular não deixa assinar, mas o que for assinado aparece nele).
                    {googleAdd && (
                      <a href={googleAdd} target="_blank" rel="noreferrer" className="mt-1.5 block">
                        <Button size="sm" variant="secondary">Abrir a tela certa do Google Agenda</Button>
                      </a>
                    )}
                  </Passo>
                  <Passo n={2}>Em <strong>Outros calendários → + → De URL</strong>, cole o endereço acima e clique em <strong>Adicionar calendário</strong>.</Passo>
                  <Passo n={3}>No celular, abra o app Google Agenda → <strong>Menu → Configurações</strong> e marque o calendário <strong>ThiagoCRM · Agenda</strong> para ele aparecer.</Passo>
                </ol>
              )}

              {aba === "iphone" && (
                <ol className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  <Passo n={1}>
                    No iPhone, toque neste botão — ele abre o Calendário já perguntando se quer assinar:
                    <a href={webcal} className="mt-1.5 block">
                      <Button size="sm" variant="secondary"><Apple /> Assinar no iPhone</Button>
                    </a>
                  </Passo>
                  <Passo n={2}>Se preferir fazer à mão: <strong>Ajustes → Apps → Calendário → Contas → Adicionar conta → Outra → Adicionar calendário assinado</strong> e cole o endereço.</Passo>
                  <Passo n={3}>Em <strong>Buscar novos dados</strong>, deixe em <strong>A cada hora</strong> para o celular atualizar sozinho.</Passo>
                </ol>
              )}

              {aba === "outlook" && (
                <ol className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  <Passo n={1}>No Outlook web, vá em <strong>Calendário → Adicionar calendário → Assinar da Web</strong>.</Passo>
                  <Passo n={2}>Cole o endereço, dê o nome <strong>ThiagoCRM</strong> e salve.</Passo>
                  <Passo n={3}>O app do Outlook no celular mostra o calendário assim que sincronizar.</Passo>
                </ol>
              )}

              <div className="rounded-xl bg-sunken p-3.5">
                <p className="text-[13px] font-semibold text-ink-2">Calendário separado por tipo</p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  Para assinar só os diagnósticos, acrescente <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11.5px]">&amp;tipo=diagnostico</code> no fim do endereço.
                  Para a agenda de uma pessoa, <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11.5px]">&amp;responsavel=Thiago</code>.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <div className="min-w-[200px] flex-1">
              <p className="text-[13px] font-semibold text-ink-2">Sem assinar</p>
              <p className="text-[12.5px] text-ink-3">Baixa um arquivo com o que já está marcado e importa no calendário. Não atualiza depois.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={baixarTudo}><Download /> Baixar .ics</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-strong">{n}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}
