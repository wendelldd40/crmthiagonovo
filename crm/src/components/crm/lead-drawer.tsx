"use client";
import * as D from "@radix-ui/react-dialog";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRightLeft, AtSign, Building2, Cable, CalendarClock, Check, Mail, MessageCircle, Pencil, Phone, Send, Trash2, X } from "lucide-react";
import { useCRM } from "@/lib/store";
import { findFunnel, findStage, followStatus } from "@/lib/domain";
import { TAG_ELO } from "@/lib/config";
import { normalizePhone } from "@/lib/elo";
import { cn, fmtDate, fmtDateTime, fmtMoney, phoneFmt } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Tip } from "@/components/ui/tooltip";
import { ConvertedChip, OriginChip, VetChip } from "./bits";
import { EsteiraSecao } from "./esteira";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13.5px]">
      <span className="shrink-0 text-ink-3">{k}</span>
      <span className="min-w-0 break-words text-right font-medium text-ink">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4">
      <h3 className="mb-1 text-[12.5px] font-semibold text-ink-3">{title}</h3>
      {children}
    </section>
  );
}

export function LeadDrawer() {
  const { detailId, closeLead, leads, funnels, setDialog, addNote, moveLeadTo, deleteLead, confirm, canEdit, can } = useCRM();
  const l = leads.find((x) => x.id === detailId);
  const [note, setNote] = useState("");
  const f = l ? findFunnel(funnels, l.funnelId) : undefined;
  const s = l ? findStage(f, l.stageId) : undefined;
  const fs = l ? followStatus(l) : null;
  const tel = l ? normalizePhone(l.phone) : null;
  const wa = tel ? `https://wa.me/${tel}` : null;

  async function submitNote() {
    if (!l || !note.trim()) return;
    await addNote(l.id, note.trim());
    setNote("");
  }

  return (
    <D.Root open={!!l} onOpenChange={(v) => !v && closeLead()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[50] bg-[#051528]/30 data-[state=open]:animate-[fade-in_180ms] data-[state=closed]:animate-[fade-out_150ms] md:bg-[#051528]/20" />
        <D.Content onOpenAutoFocus={(e) => e.preventDefault()} className="fixed inset-y-0 right-0 z-[51] flex w-full max-w-[460px] flex-col bg-surface shadow-pop outline-none data-[state=open]:animate-[sheet-in_260ms_cubic-bezier(.2,.9,.3,1)] data-[state=closed]:animate-[sheet-out_180ms_ease-in] md:border-l md:border-line">
          {l && (
            <>
              <D.Title className="sr-only">{l.name}</D.Title>
              <D.Description className="sr-only">Detalhes do lead</D.Description>

              <div className="relative px-5 pb-4 pt-5">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: s?.color ?? f?.color ?? "var(--brand)" }} />
                <div className="flex items-start gap-3.5">
                  <Avatar name={l.name} size={48} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-ink">{l.name}</h2>
                    <p className="mt-0.5 truncate text-[13px] text-ink-3">{[l.company, l.instagram].filter(Boolean).join("  ·  ") || "Sem empresa ou Instagram"}</p>
                  </div>
                  {canEdit && (
                    <Tip label="Excluir lead">
                      <button
                        onClick={() => confirm("Excluir lead", `“${l.name}” e todo o histórico serão apagados. Não dá para desfazer.`, "Excluir lead", () => deleteLead(l.id))}
                        className="rounded-lg p-1.5 text-ink-3 hover:bg-coral-soft hover:text-coral"
                        aria-label="Excluir lead"
                      >
                        <Trash2 className="size-[18px]" />
                      </button>
                    </Tip>
                  )}
                  <D.Close className="-mr-1 rounded-lg p-1.5 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Fechar">
                    <X className="size-[18px]" />
                  </D.Close>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <ConvertedChip lead={l} />
                  <VetChip lead={l} />
                  <OriginChip value={l.origin} />
                  {fs === "overdue" && <Chip color="var(--coral)"><CalendarClock /> Atrasado desde {fmtDate(l.followUp)}</Chip>}
                  {fs === "today" && <Chip color="var(--amber)"><CalendarClock /> Contato hoje</Chip>}
                  {fs === "upcoming" && <Chip color="var(--ink-2)"><CalendarClock /> Contato {fmtDate(l.followUp)}</Chip>}
                  {l.tags.includes(TAG_ELO) && <Chip color="var(--brand)"><Cable /> No Elo</Chip>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {wa && (
                    <Button asChild size="sm" variant="whatsapp">
                      <a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                    </Button>
                  )}
                  {canEdit && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "lead", leadId: l.id })}><Pencil /> Editar</Button>
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "move", leadId: l.id })}><ArrowRightLeft /> Mover</Button>
                      {can("elo") && (
                        <Tip label={l.phone ? "Criar ou atualizar este contato no Elo" : "Precisa de telefone para ir ao Elo"}>
                          <span>
                            <Button size="sm" variant="secondary" disabled={!l.phone} onClick={() => setDialog({ kind: "elo", leadIds: [l.id] })}><Cable /> Elo</Button>
                          </span>
                        </Tip>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                {f && (
                  <section className="border-t border-line px-5 py-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="text-[12.5px] font-semibold text-ink-3">Etapa em {f.name}</h3>
                      {l.value > 0 && <span className="tabular text-[13px] font-semibold text-brand-strong">{fmtMoney(l.value)}</span>}
                    </div>
                    <div className="flex gap-1">
                      {f.stages.map((st, i) => {
                        const idx = f.stages.findIndex((x) => x.id === l.stageId);
                        const reached = i <= idx;
                        const current = i === idx;
                        return (
                          <Tip key={st.id} label={canEdit && !current ? `Mover para ${st.name}` : st.name}>
                            <button
                              disabled={!canEdit || current}
                              onClick={() => void moveLeadTo(l.id, f.id, st.id)}
                              className={cn("group relative h-8 flex-1 overflow-hidden rounded-md transition-[filter]", canEdit && !current && "hover:brightness-110")}
                              style={{ background: reached ? st.color : `color-mix(in oklab, ${st.color} 16%, var(--sunken))` }}
                              aria-label={st.name}
                            >
                              {current && <motion.span layoutId={`stage-${l.id}`} className="absolute inset-0 ring-2 ring-inset ring-white/70" />}
                            </button>
                          </Tip>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[14px] font-semibold" style={{ color: s?.color }}>{s?.name ?? "Sem etapa"}</p>
                  </section>
                )}

                <EsteiraSecao lead={l} />

                <Section title="Contato">
                  {l.phone && <Row k="WhatsApp"><span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-ink-3" />{phoneFmt(l.phone)}</span></Row>}
                  {l.email && <Row k="E-mail"><a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:text-brand"><Mail className="size-3.5 text-ink-3" />{l.email}</a></Row>}
                  {l.instagram && (
                    <Row k="Instagram">
                      <a href={`https://instagram.com/${l.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#d6336c] hover:underline">
                        <AtSign className="size-3.5" />{l.instagram.replace("@", "")}
                      </a>
                    </Row>
                  )}
                  {l.company && <Row k="Clínica / empresa"><span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5 text-ink-3" />{l.company}</span></Row>}
                  <Row k="Entrada">{fmtDate(l.date)}</Row>
                  {l.followUp && <Row k="Próximo contato"><span className={cn(fs === "overdue" && "text-coral", fs === "today" && "text-amber")}>{fmtDate(l.followUp)}</span></Row>}
                  {l.converted && <Row k="Convertido em">{fmtDate(l.convertedDate)} · {l.serviceMonths || 0} {l.serviceMonths === 1 ? "mês" : "meses"} de serviço</Row>}
                </Section>

                {(l.tags.length > 0 || l.notes) && (
                  <Section title="Notas e tags">
                    {l.tags.length > 0 && (
                      <div className="mb-2 mt-1 flex flex-wrap gap-1.5">
                        {l.tags.map((t) => <Chip key={t} color="var(--brand)">{t}</Chip>)}
                      </div>
                    )}
                    {l.notes && <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-[13.5px] leading-relaxed text-ink-2">{l.notes}</p>}
                  </Section>
                )}

                <Section title={`Histórico (${l.activities.length})`}>
                  {l.activities.length === 0 ? (
                    <p className="py-4 text-center text-[13px] text-ink-3">Nenhuma atividade registrada.</p>
                  ) : (
                    <ol className="relative mt-2 space-y-3.5 pl-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-line">
                      {[...l.activities].reverse().map((a, i) => (
                        <li key={a.time + i} className="relative">
                          <span className={cn("absolute -left-5 top-1 size-[11px] rounded-full border-2 border-surface", i === 0 ? "bg-brand" : "bg-line-strong")} />
                          <p className="text-[13.5px] leading-snug text-ink">{a.text}</p>
                          <p className="text-xs text-ink-3">{fmtDateTime(a.time)}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </Section>
              </div>

              {canEdit && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitNote();
                  }}
                  className="flex items-center gap-2 border-t border-line bg-surface-2 p-3"
                >
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Registrar nota ou atividade"
                    className="h-10 flex-1 rounded-[10px] border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
                  />
                  <Button type="submit" size="icon" disabled={!note.trim()} aria-label="Salvar nota">
                    {note.trim() ? <Send /> : <Check />}
                  </Button>
                </form>
              )}
            </>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
