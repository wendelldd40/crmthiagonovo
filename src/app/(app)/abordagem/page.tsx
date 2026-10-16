"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cable, Check, ChevronDown, Copy, Flame, Loader2, MessageCircle, RotateCcw, Snowflake, Thermometer } from "lucide-react";
import { useCRM } from "@/lib/store";
import { SETTING } from "@/lib/config";
import {
  PERFIL_LABEL,
  RECENCIA_LABEL,
  SCRIPT_DEFAULTS,
  applyScript,
  genero,
  isAbordado,
  isPlanilhaComFone,
  leadPerfil,
  recencia,
  waLink,
  type Genero,
  type Perfil,
  type Recencia,
} from "@/lib/domain";
import type { Lead } from "@/lib/types";
import { cn, copyText, fmtDate, matches, phoneFmt, plural } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, Empty, Notice } from "@/components/ui/card";
import { SearchInput, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";

const REC_ICON = { quente: Flame, morno: Thermometer, frio: Snowflake } as const;
const REC_COLOR = { quente: "var(--coral)", morno: "var(--amber)", frio: "var(--sky)" } as const;
const GEN_LABEL: Record<Genero, string> = { feminino: "Dra.", masculino: "Dr.", neutro: "Sem gênero" };
const PAGE = 40;

function LeadCard({ l, text, onText, scripts }: { l: Lead; text: string | undefined; onText: (v: string | undefined) => void; scripts: Record<Perfil, string> }) {
  const { funnels, markAbordado, openLead, canEdit, toast } = useCRM();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = applyScript(l, funnels, scripts);
  const msg = text ?? base;
  const link = waLink(l.phone, msg);
  const perf = leadPerfil(l, funnels);
  const rec = recencia(l.date);
  const g = genero(l);
  const done = isAbordado(l);
  const RecIcon = REC_ICON[rec];

  return (
    <Card className={cn("overflow-hidden transition-opacity", done && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <button onClick={() => openLead(l.id)} className="relative" aria-label={`Abrir ${l.name}`}>
          <Avatar name={l.name} size={40} />
          {done && <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-ok text-white ring-2 ring-surface"><Check className="size-2.5" strokeWidth={3.5} /></span>}
        </button>
        <div className="min-w-[160px] flex-1">
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">{l.name}{done && <Chip color="var(--ok)">Abordado</Chip>}</p>
          <p className="tabular text-[12.5px] text-ink-3">{phoneFmt(l.phone)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {perf && <Chip color={perf === "gestor" ? "#2563eb" : "#059669"}>{PERFIL_LABEL[perf]}</Chip>}
          <Chip color={REC_COLOR[rec]}><RecIcon />{RECENCIA_LABEL[rec]}</Chip>
          <Chip color="var(--ink-3)">{GEN_LABEL[g]}</Chip>
          <span className="tabular text-[12px] text-ink-3">comprou em {fmtDate(l.date)}</span>
        </div>
        <Button size="sm" variant={open ? "soft" : "secondary"} onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Fechar" : "Ver mensagem"} <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }} className="overflow-hidden">
            <div className="border-t border-line bg-surface-2 px-4 py-4 sm:px-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-ink-3">Edite à vontade: o link do WhatsApp usa o texto como está aqui</p>
                {text !== undefined && <Button size="xs" variant="ghost" onClick={() => onText(undefined)}><RotateCcw /> Voltar ao script</Button>}
              </div>
              <Textarea rows={9} value={msg} onChange={(e) => onText(e.target.value)} className="bg-surface text-[14px] leading-relaxed" />
              <p className={cn("tabular mt-1.5 text-xs", msg.length > 1000 ? "text-coral" : msg.length > 800 ? "text-amber" : "text-ink-3")}>{msg.length} caracteres{msg.length > 1000 && " · acima de 1.000 a primeira mensagem perde resposta"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="whatsapp" className={cn(!link && "pointer-events-none opacity-40")}>
                  <a href={link ?? "#"} target="_blank" rel="noreferrer"><MessageCircle /> Abrir no WhatsApp</a>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void copyText(msg).then(() => toast("Mensagem copiada"))}><Copy /> Copiar</Button>
                {canEdit && !done && (
                  <Button
                    size="sm"
                    variant="soft"
                    className="ml-auto"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await markAbordado(l.id);
                      setBusy(false);
                      setOpen(false);
                    }}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <Check />} Marcar como abordado
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function AbordagemPage() {
  const { leads, funnels, settings, setSetting, setDialog, can, toast, canEdit } = useCRM();
  const [perfil, setPerfil] = useState<"todos" | Perfil>("todos");
  const [rec, setRec] = useState<"todos" | Recencia>("todos");
  const [gen, setGen] = useState<"todos" | Genero>("todos");
  const [showDone, setShowDone] = useState(false);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);

  const saved: Record<Perfil, string> = {
    gestor: settings[SETTING.scriptGestor] || SCRIPT_DEFAULTS.gestor,
    autonomo: settings[SETTING.scriptAutonomo] || SCRIPT_DEFAULTS.autonomo,
  };
  const [draft, setDraft] = useState(saved);
  const savedKey = saved.gestor + "\u0000" + saved.autonomo;
  const [prevKey, setPrevKey] = useState(savedKey);
  if (prevKey !== savedKey) {
    setPrevKey(savedKey);
    setDraft(saved);
  }
  const dirty = draft.gestor !== saved.gestor || draft.autonomo !== saved.autonomo;

  const pool = useMemo(() => leads.filter(isPlanilhaComFone), [leads]);
  const filtered = useMemo(
    () =>
      pool
        .filter((l) => showDone || !isAbordado(l))
        .filter((l) => perfil === "todos" || leadPerfil(l, funnels) === perfil)
        .filter((l) => rec === "todos" || recencia(l.date) === rec)
        .filter((l) => gen === "todos" || genero(l) === gen)
        .filter((l) => matches(l, q))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [pool, showDone, perfil, rec, gen, q, funnels],
  );
  const done = pool.filter(isAbordado).length;

  async function saveScripts() {
    try {
      await Promise.all([setSetting(SETTING.scriptGestor, draft.gestor), setSetting(SETTING.scriptAutonomo, draft.autonomo)]);
      setEdits({});
      toast("Script salvo para toda a equipe");
    } catch {}
  }

  return (
    <>
      <PageHeader title="Abordagem" subtitle="Mensagem pronta para cada lead da planilha do kit, com link direto para o WhatsApp">
        {can("elo") && filtered.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "elo", leadIds: filtered.map((l) => l.id) })}><Cable /> Enviar {filtered.length} ao Elo</Button>
        )}
      </PageHeader>
      <PageBody className="space-y-5">
        <Card className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-line">
          {[
            { l: "Com WhatsApp", v: pool.length },
            { l: "Já abordados", v: done },
            { l: "Faltam", v: pool.length - done },
            { l: "Progresso", v: pool.length ? `${Math.round((done / pool.length) * 100)}%` : "0%" },
          ].map((k) => (
            <div key={k.l} className="px-5 py-4">
              <p className="text-[13px] text-ink-3">{k.l}</p>
              <p className="tabular mt-1 font-display text-3xl font-semibold text-ink">{k.v}</p>
            </div>
          ))}
          <div className="col-span-2 h-1.5 bg-sunken md:col-span-4">
            <motion.div className="h-full bg-ok" initial={{ width: 0 }} animate={{ width: `${pool.length ? (done / pool.length) * 100 : 0}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <button onClick={() => setEditorOpen(!editorOpen)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-2" aria-expanded={editorOpen}>
            <div className="flex-1">
              <p className="font-display text-[15.5px] font-semibold text-ink">Script da equipe</p>
              <p className="text-[13px] text-ink-3">Um texto para gestores e outro para autônomos. Salvo no banco, vale para todos.</p>
            </div>
            {dirty && <Chip color="var(--amber)">Não salvo</Chip>}
            <ChevronDown className={cn("size-5 text-ink-3 transition-transform", editorOpen && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {editorOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="space-y-4 border-t border-line px-5 py-4">
                  <div className="flex flex-wrap gap-2 text-[12.5px]">
                    {[
                      ["{nome}", "primeiro nome"],
                      ["{saudacao}", "Dra. ou Dr. + nome"],
                      ["{contexto}", "frase sobre quando comprou o kit"],
                      ["{perfil}", "Gestor ou Autônomo"],
                    ].map(([v, d]) => (
                      <span key={v} className="rounded-lg bg-sunken px-2 py-1"><code className="font-semibold text-brand-strong">{v}</code> <span className="text-ink-3">{d}</span></span>
                    ))}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {(["gestor", "autonomo"] as Perfil[]).map((p) => (
                      <div key={p}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-[13px] font-semibold" style={{ color: p === "gestor" ? "#2563eb" : "#059669" }}>Para {p === "gestor" ? "gestores" : "autônomos"}</p>
                          <Button size="xs" variant="ghost" onClick={() => setDraft((d) => ({ ...d, [p]: SCRIPT_DEFAULTS[p] }))}><RotateCcw /> Original</Button>
                        </div>
                        <Textarea rows={11} value={draft[p]} onChange={(e) => setDraft((d) => ({ ...d, [p]: e.target.value }))} disabled={!canEdit} className="text-[13.5px]" />
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <div className="flex items-center justify-end gap-2">
                      {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(saved)}>Descartar</Button>}
                      <Button size="sm" disabled={!dirty} onClick={() => void saveScripts()}>Salvar script</Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Nome ou telefone" className="w-full sm:w-60" />
          <Select value={perfil} onChange={(e) => setPerfil(e.target.value as typeof perfil)} className="w-[calc(50%-4px)] sm:w-40">
            <option value="todos">Todos os perfis</option>
            <option value="gestor">Gestores</option>
            <option value="autonomo">Autônomos</option>
          </Select>
          <Select value={rec} onChange={(e) => setRec(e.target.value as typeof rec)} className="w-[calc(50%-4px)] sm:w-60">
            <option value="todos">Qualquer data de compra</option>
            <option value="quente">Quentes (até 3 meses)</option>
            <option value="morno">Mornos (3 a 8 meses)</option>
            <option value="frio">Frios (mais de 8 meses)</option>
          </Select>
          <Select value={gen} onChange={(e) => setGen(e.target.value as typeof gen)} className="w-[calc(50%-4px)] sm:w-44">
            <option value="todos">Qualquer gênero</option>
            <option value="feminino">Feminino (Dra.)</option>
            <option value="masculino">Masculino (Dr.)</option>
            <option value="neutro">Não identificado</option>
          </Select>
          <label className="flex h-9 items-center gap-2 px-1 text-[13px] font-medium text-ink-2">
            <Switch checked={showDone} onCheckedChange={setShowDone} /> Mostrar abordados
          </label>
        </div>

        {pool.length === 0 && (
          <Notice tone="info">Esta tela lista leads com a tag “planilha” e telefone com DDD. Importe a planilha do kit com essa tag para usar.</Notice>
        )}

        <p className="text-[13px] text-ink-3">{plural(filtered.length, "lead nesta lista", "leads nesta lista")}</p>
        {filtered.length ? (
          <div className="space-y-2.5">
            {filtered.slice(0, limit).map((l) => (
              <LeadCard
                key={l.id}
                l={l}
                scripts={saved}
                text={edits[l.id]}
                onText={(v) =>
                  setEdits((e) => {
                    const n = { ...e };
                    if (v === undefined) delete n[l.id];
                    else n[l.id] = v;
                    return n;
                  })
                }
              />
            ))}
            {filtered.length > limit && (
              <Button variant="secondary" className="w-full" onClick={() => setLimit((n) => n + PAGE)}>Mostrar mais {Math.min(PAGE, filtered.length - limit)}</Button>
            )}
          </div>
        ) : (
          pool.length > 0 && <Card><Empty icon={MessageCircle} title="Ninguém com esses filtros">{!showDone && done > 0 ? "Os já abordados estão escondidos. Ligue “Mostrar abordados” para vê-los." : "Mude os filtros acima."}</Empty></Card>
        )}
      </PageBody>
    </>
  );
}

