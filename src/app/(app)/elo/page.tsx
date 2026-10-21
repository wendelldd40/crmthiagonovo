"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Cable, CircleCheck, CircleDashed, Loader2, PlugZap } from "lucide-react";
import { backend, useCRM } from "@/lib/store";
import { IS_DEMO, SETTING, TAG_ELO } from "@/lib/config";
import { normalizePhone } from "@/lib/elo";
import { pct, plural } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Notice } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CountUp } from "@/components/ui/count-up";
import { OwlMark } from "@/components/shell/logo";
import { useCadencias } from "@/components/crm/esteira";
import { Copy } from "lucide-react";
import { copyText } from "@/lib/utils";

type Status = { configurado: boolean; host: string | null; simulado?: boolean; retorno?: boolean } | { erro: string } | null;

const MAP = [
  ["Nome", "Nome do contato"],
  ["WhatsApp", "Telefone (com 55 na frente)"],
  ["E-mail", "E-mail"],
  ["Funil", "Etiqueta + campo funil"],
  ["Etapa", "Campo etapa (atualiza a cada envio)"],
  ["Origem", "Etiqueta + campo origem"],
  ["Gestor ou autônomo", "Etiqueta + campo perfil"],
  ["Clínica, Instagram, valor", "Campos empresa, instagram, valor_estimado"],
  ["Convertido", "Etiqueta Cliente"],
];

export default function EloPage() {
  const { leads, funnels, settings, setSetting, setDialog, canEdit, toast } = useCRM();
  const [status, setStatus] = useState<Status>(null);
  const [funnel, setFunnel] = useState("all");
  const [onlyNew, setOnlyNew] = useState(true);
  const [tag, setTag] = useState(settings[SETTING.eloEtiqueta] ?? "");
  const auto = settings[SETTING.eloAutoSync] === "true";
  const { lista: cadencias } = useCadencias();
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/elo/webhook` : "/api/elo/webhook";
  const retornoOk = !!status && "retorno" in status && !!status.retorno;

  useEffect(() => {
    void (async () => {
      try {
        const token = await backend.accessToken();
        const r = await fetch("/api/elo", { headers: { authorization: `Bearer ${token ?? ""}`, "x-crm-demo": IS_DEMO ? "1" : "0" } });
        setStatus(await r.json());
      } catch {
        setStatus({ erro: "Não foi possível consultar o servidor do CRM." });
      }
    })();
  }, []);

  const n = useMemo(() => {
    const withPhone = leads.filter((l) => normalizePhone(l.phone));
    const inElo = leads.filter((l) => l.tags.includes(TAG_ELO));
    const scope = withPhone.filter((l) => (funnel === "all" || l.funnelId === funnel) && (!onlyNew || !l.tags.includes(TAG_ELO)));
    return { total: leads.length, withPhone: withPhone.length, inElo: inElo.length, scope };
  }, [leads, funnel, onlyNew]);

  const ok = status && "configurado" in status && (status.configurado || status.simulado);

  return (
    <>
      <PageHeader title="Integração Elo" subtitle="Leve os leads do CRM para o atendimento no WhatsApp" />
      <PageBody className="space-y-5">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-5 bg-navy px-5 py-5 text-navy-ink">
            <div className="flex items-center gap-3">
              <OwlMark className="size-11" />
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="size-1.5 rounded-full bg-[#3fc3b2]" animate={ok ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.25 }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }} />
                ))}
                <ArrowRight className="ml-0.5 size-4 text-[#3fc3b2]" />
              </div>
              <span className="grid size-11 place-items-center rounded-[11px] bg-[#0e6b5c]">
                <svg viewBox="0 0 32 32" className="size-8"><rect x="6.5" y="10" width="12" height="12" rx="6" fill="none" stroke="#fff" strokeWidth="2.6" /><rect x="13.5" y="10" width="12" height="12" rx="6" fill="none" stroke="#f0b65e" strokeWidth="2.6" /></svg>
              </span>
            </div>
            <div className="min-w-[220px] flex-1">
              {!status ? (
                <p className="flex items-center gap-2 text-sm text-navy-ink-2"><Loader2 className="size-4 animate-spin" /> Verificando conexão…</p>
              ) : "erro" in status ? (
                <p className="text-sm text-[#ff9a88]">{status.erro}</p>
              ) : status.configurado ? (
                <>
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-white"><CircleCheck className="size-5 text-[#5fd6c6]" /> Conectado ao Elo</p>
                  <p className="text-[13px] text-navy-ink-2">{status.host}</p>
                </>
              ) : status.simulado ? (
                <>
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-white"><PlugZap className="size-5 text-[#f6cf8a]" /> Envio simulado</p>
                  <p className="text-[13px] text-navy-ink-2">Modo demonstração: os envios funcionam na tela, mas nada sai do navegador.</p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-white"><CircleDashed className="size-5 text-[#f6cf8a]" /> Elo ainda não configurado</p>
                  <p className="text-[13px] text-navy-ink-2">Faltam as variáveis ELO_API_URL e ELO_API_KEY na Vercel. Veja o passo a passo abaixo.</p>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            {[
              { l: "Leads no CRM", v: n.total },
              { l: "Com WhatsApp válido", v: n.withPhone },
              { l: "Já no Elo", v: n.inElo },
              { l: "Cobertura", v: pct(n.inElo, n.withPhone), f: (x: number) => `${Math.round(x)}%` },
            ].map((k) => (
              <div key={k.l} className="px-5 py-4">
                <p className="text-[13px] text-ink-3">{k.l}</p>
                <CountUp value={k.v} format={k.f} className="tabular mt-1 block font-display text-3xl font-semibold text-ink" />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHead title="Enviar em lote" subtitle="Cria ou atualiza os contatos no Elo. Ninguém recebe mensagem." />
            <div className="space-y-4 px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Quais leads">
                  <Select value={funnel} onChange={(e) => setFunnel(e.target.value)}>
                    <option value="all">Todos os funis</option>
                    {funnels.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                  </Select>
                </Field>
                <Field label="Repetidos">
                  <label className="flex h-10 items-center gap-2.5 text-[13.5px] text-ink-2">
                    <Switch checked={onlyNew} onCheckedChange={setOnlyNew} /> Só quem ainda não está no Elo
                  </label>
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3.5">
                <p className="flex-1 text-[14px] text-ink-2"><b className="tabular font-display text-xl font-semibold text-ink">{n.scope.length}</b> {n.scope.length === 1 ? "lead pronto" : "leads prontos"} para enviar</p>
                <Button disabled={!ok || !n.scope.length || !canEdit} onClick={() => setDialog({ kind: "elo", leadIds: n.scope.map((l) => l.id) })}>
                  <Cable /> Revisar e enviar
                </Button>
              </div>
              <p className="text-[12.5px] text-ink-3">Para mandar só alguns, selecione na tela Leads ou use o botão Elo dentro do lead. Leads sem telefone ficam de fora: o Elo identifica cada contato pelo número.</p>
            </div>
          </Card>

          <Card>
            <CardHead title="Envio automático" subtitle="Mantém o Elo em dia sem precisar lembrar" />
            <div className="space-y-4 px-5 pb-5">
              <label className="flex items-start gap-3">
                <Switch
                  className="mt-0.5"
                  checked={auto}
                  disabled={!canEdit || !ok}
                  onCheckedChange={(v) => void setSetting(SETTING.eloAutoSync, v ? "true" : "false").then(() => toast(v ? "Envio automático ligado" : "Envio automático desligado"))}
                />
                <span className="text-[14px] text-ink-2">Enviar ao Elo sempre que um lead com WhatsApp for criado, editado ou mudar de etapa.</span>
              </label>
              <Field label="Etiqueta extra em todo envio" hint="Separe várias por vírgula. Deixe vazio se não quiser.">
                <div className="flex gap-2">
                  <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: Lead CRM" disabled={!canEdit} />
                  <Button variant="secondary" disabled={!canEdit || tag === (settings[SETTING.eloEtiqueta] ?? "")} onClick={() => void setSetting(SETTING.eloEtiqueta, tag.trim()).then(() => toast("Etiqueta salva"))}>Salvar</Button>
                </div>
              </Field>
              <Field label="Cadência no envio automático" hint="Lead novo enviado sozinho já entra nesta cadência no Elo.">
                <Select
                  value={settings[SETTING.eloCadencia] ?? ""}
                  disabled={!canEdit || !cadencias}
                  onChange={(e) => void setSetting(SETTING.eloCadencia, e.target.value).then(() => toast(e.target.value ? `Cadência padrão: ${e.target.value}` : "Sem cadência padrão"))}
                >
                  <option value="">Nenhuma</option>
                  {cadencias?.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </Select>
              </Field>
              <Notice tone="amber">Vale para toda a equipe. Com o automático ligado, o campo etapa no Elo acompanha o Kanban do CRM.</Notice>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="Como o lead chega no Elo" />
            <div className="px-5 pb-5">
              <table className="w-full text-[13.5px]">
                <tbody>
                  {MAP.map(([a, b]) => (
                    <tr key={a} className="border-t border-line first:border-0">
                      <td className="py-2 pr-3 text-ink-2">{a}</td>
                      <td className="py-2 text-ink-3"><ArrowRight className="mr-2 inline size-3.5 text-brand" />{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[12.5px] text-ink-3">Etiquetas nunca são removidas no Elo; os campos são sobrescritos a cada envio. O ID do lead vai em crm_id para o caminho de volta.</p>
            </div>
          </Card>

          <Card>
            <CardHead title="Configurar (uma vez, na Vercel)" />
            <ol className="space-y-3 px-5 pb-5 text-[14px] text-ink-2">
              {[
                <>No Elo, abra <b className="text-ink">Integrador</b>, aba <b className="text-ink">API</b>, e crie uma chave chamada “ThiagoCRM”. Ela começa com <code className="rounded bg-sunken px-1">elo_</code> e só aparece uma vez.</>,
                <>No projeto do CRM na Vercel, em Settings → Environment Variables, crie <code className="rounded bg-sunken px-1">ELO_API_KEY</code> com essa chave.</>,
                <>Crie <code className="rounded bg-sunken px-1">ELO_API_URL</code> com o endereço do Elo, sem barra no final.</>,
                <>Faça um novo deploy. Esta tela passa a mostrar “Conectado ao Elo”.</>,
              ].map((s, i) => (
                <li key={i} className="flex gap-3"><span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-strong">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
            <p className="px-5 pb-5 text-[12.5px] text-ink-3">A chave fica só no servidor. O navegador nunca a recebe: ele pede ao servidor do CRM, que confere seu login e só então fala com o Elo.</p>
          </Card>
        </div>
        <Card>
          <CardHead
            title="Esteira de contatos (Elo → CRM)"
            subtitle="O Elo conta 1 contato por dia com mensagem ou ligação da equipe e avisa o CRM: contador no cartão, próximo contato no follow-up e etapa andando sozinha."
          >
            {status && "retorno" in status && (
              <span className={retornoOk ? "rounded-lg bg-ok-soft px-2.5 py-1 text-[12.5px] font-semibold text-ok" : "rounded-lg bg-amber-soft px-2.5 py-1 text-[12.5px] font-semibold text-[#7a4d06] dark:text-amber"}>
                {retornoOk ? "Retorno configurado" : "Retorno ainda não configurado"}
              </span>
            )}
          </CardHead>
          <div className="grid gap-6 px-5 pb-5 lg:grid-cols-2">
            <ol className="space-y-3 text-[14px] text-ink-2">
              {[
                <>No Supabase <b className="text-ink">do CRM</b>, rode o arquivo <code className="rounded bg-sunken px-1">supabase/esteira-elo.sql</code> (só adiciona colunas).</>,
                <>No Elo, abra <b className="text-ink">Integrador → Webhooks</b>, crie um webhook com a URL abaixo e marque só o evento <b className="text-ink">Esteira de contatos atualizada</b>.</>,
                <>Copie o segredo que o Elo mostrar e cadastre na Vercel do CRM como <code className="rounded bg-sunken px-1">ELO_WEBHOOK_SECRET</code>.</>,
                <>Cadastre também <code className="rounded bg-sunken px-1">SUPABASE_SERVICE_ROLE_KEY</code> (do Supabase do CRM, em Settings → API). Ela fica só no servidor.</>,
                <>Faça um novo deploy. Use o botão Testar do webhook no Elo: o log deve mostrar resposta 200.</>,
              ].map((t, i) => (
                <li key={i} className="flex gap-3"><span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-strong">{i + 1}</span><span>{t}</span></li>
              ))}
            </ol>
            <div className="space-y-4">
              <Field label="URL do webhook (cole no Elo)">
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="secondary" onClick={() => void copyText(webhookUrl).then(() => toast("URL copiada"))}><Copy /> Copiar</Button>
                </div>
              </Field>
              <div className="rounded-xl bg-surface-2 p-3.5 text-[13px] leading-relaxed text-ink-2">
                <p className="mb-1 font-semibold text-ink">Para a etapa andar sozinha</p>
                Nomeie etapas do funil com o número do contato: <b className="text-ink">1º contato</b>, <b className="text-ink">2º contato</b>, <b className="text-ink">3º contato</b>… (também valem &ldquo;Contato 2&rdquo;, &ldquo;Segundo contato&rdquo;, &ldquo;3ª tentativa&rdquo;). No 2º contato o lead vai para a etapa 2. Ele só anda para frente: lead em Proposta ou Fechado não volta. Funis sem essas etapas recebem só o contador e o próximo contato.
              </div>
              <Notice tone="info">Enquanto a cadência estiver ativa, o &ldquo;próximo contato&rdquo; do lead passa a ser definido pelo Elo e substitui a data marcada à mão.</Notice>
            </div>
          </div>
        </Card>

        {!IS_DEMO && n.withPhone < n.total && (
          <p className="text-center text-[13px] text-ink-3">{plural(n.total - n.withPhone, "lead não tem", "leads não têm")} WhatsApp válido e não {n.total - n.withPhone === 1 ? "pode" : "podem"} ir ao Elo.</p>
        )}
      </PageBody>
    </>
  );
}
