"use client";
import { CalendarPlus, Check, Clock, ExternalLink, MapPin, MessageCircle, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { useCRM } from "@/lib/store";
import { STATUS_COMPROMISSO, STATUS_ORDEM, tipoDef, WEEKDAYS } from "@/lib/constants";
import { horaFim, quandoLabel } from "@/lib/domain";
import { baixarIcs, linkGoogleAgenda } from "@/lib/ics";
import type { Compromisso, StatusCompromisso } from "@/lib/types";
import { cn, fmtDate, fmtMoney, normalizePhone, today } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

/** Quadradinho da data, igual ao das próximas sessões do Thiago. */
export function DataBadge({ data, destaque }: { data: string; destaque?: boolean }) {
  const d = new Date(data + "T00:00:00");
  return (
    <span className={cn("grid w-11 shrink-0 rounded-xl py-1 text-center", destaque ? "bg-brand text-brand-ink" : "bg-sunken")}>
      <span className="tabular font-display text-lg font-semibold leading-tight">{d.getDate()}</span>
      <span className={cn("text-[11px]", destaque ? "" : "text-ink-3")}>{WEEKDAYS[d.getDay()]}</span>
    </span>
  );
}

export function StatusChip({ status }: { status: StatusCompromisso }) {
  const s = STATUS_COMPROMISSO[status];
  const Icon = s.icon;
  return (
    <Chip color={s.color}>
      <Icon /> {s.label}
    </Chip>
  );
}

/** Menu com as ações do compromisso, inclusive mandar para o calendário do celular. */
export function AcoesCompromisso({ c, align = "end" }: { c: Compromisso; align?: "start" | "end" }) {
  const { setDialog, setAgendaStatus, deleteAgenda, confirm, canEdit, openLead } = useCRM();
  const fone = normalizePhone(c.leadTelefone || "");
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button size="icon-xs" variant="ghost" aria-label="Ações do compromisso">
          <MoreHorizontal />
        </Button>
      </MenuTrigger>
      <MenuContent align={align} className="w-60">
        {canEdit && (
          <>
            {STATUS_ORDEM.filter((s) => s !== c.status).map((s) => {
              const def = STATUS_COMPROMISSO[s];
              const Icon = def.icon;
              return (
                <MenuItem key={s} onSelect={() => void setAgendaStatus(c.id, s)}>
                  <Icon style={{ color: def.color }} /> Marcar como {def.label.toLowerCase()}
                </MenuItem>
              );
            })}
            <MenuSeparator />
          </>
        )}
        <MenuItem onSelect={() => window.open(linkGoogleAgenda(c, window.location.origin + "/agenda"), "_blank")}>
          <CalendarPlus /> Adicionar ao Google Agenda
        </MenuItem>
        <MenuItem onSelect={() => baixarIcs(c, window.location.origin + "/agenda")}>
          <ExternalLink /> Baixar para o calendário (.ics)
        </MenuItem>
        {fone && (
          <MenuItem onSelect={() => window.open(`https://wa.me/${fone}`, "_blank")}>
            <MessageCircle /> Abrir WhatsApp
          </MenuItem>
        )}
        {c.leadId && (
          <MenuItem onSelect={() => openLead(c.leadId!)}>
            <UserRound /> Abrir o lead
          </MenuItem>
        )}
        {canEdit && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => setDialog({ kind: "agenda", agendaId: c.id })}>
              <Pencil /> Editar
            </MenuItem>
            <MenuItem
              className="text-coral data-[highlighted]:bg-coral-soft [&_svg]:text-coral"
              onSelect={() => confirm("Excluir compromisso", `“${c.titulo}” sai da agenda. Isso não apaga o lead.`, "Excluir", () => deleteAgenda(c.id))}
            >
              <Trash2 /> Excluir
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

/** Linha da lista: hora, o que é, com quem, quem marcou. */
export function LinhaCompromisso({ c, mostrarData = true }: { c: Compromisso; mostrarData?: boolean }) {
  const { setDialog, setAgendaStatus, canEdit } = useCRM();
  const t = today();
  const def = tipoDef(c.tipo);
  const Icon = def.icon;
  const hoje = c.data === t;
  const atrasado = c.data < t && STATUS_COMPROMISSO[c.status].aberto;
  const quando = quandoLabel(c.data, t);
  const riscado = c.status === "cancelado";

  return (
    <li className={cn("group flex items-start gap-3 px-5 py-3", riscado && "opacity-55")}>
      {mostrarData ? <DataBadge data={c.data} destaque={hoje} /> : <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${def.color} 13%, transparent)`, color: def.color }}><Icon className="size-[18px]" /></span>}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn("text-[14px] font-semibold text-ink", riscado && "line-through")}>{c.titulo}</p>
          <Chip color={def.color}><Icon /> {def.label}</Chip>
          {atrasado && <Chip color="var(--coral)">Sem baixa</Chip>}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-ink-3">
          {c.hora ? (
            <span className="tabular inline-flex items-center gap-1 font-medium text-ink-2">
              <Clock className="size-3.5" /> {c.hora}–{horaFim(c.hora, c.duracaoMin)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> Dia inteiro</span>
          )}
          {mostrarData && <span className="tabular">{fmtDate(c.data)}{quando && ` · ${quando}`}</span>}
          {c.leadNome && <span className="inline-flex items-center gap-1 text-ink-2"><UserRound className="size-3.5" /> {c.leadNome}</span>}
          {c.local && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              {c.local.startsWith("http") ? (
                <a href={c.local} target="_blank" rel="noreferrer" className="truncate underline decoration-line-strong underline-offset-2 hover:text-ink-2">
                  {c.local.replace(/^https?:\/\//, "").slice(0, 32)}
                </a>
              ) : (
                <span className="truncate">{c.local}</span>
              )}
            </span>
          )}
          {c.valor > 0 && <span className="tabular font-semibold text-brand-strong">{fmtMoney(c.valor)}</span>}
        </p>

        {c.observacoes && <p className="mt-1 line-clamp-2 text-[12.5px] italic text-ink-3">{c.observacoes}</p>}

        <p className="mt-1.5 text-[11.5px] text-ink-3">
          {c.responsavelNome && <>Conduz <span className="font-medium text-ink-2">{c.responsavelNome}</span> · </>}
          Marcado por <span className="font-medium text-ink-2">{c.marcadoPorNome || "—"}</span>
          {c.marcadoEm && <> em {fmtDate(c.marcadoEm.slice(0, 10))}</>}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        <StatusChip status={c.status} />
        <div className="flex items-center gap-1">
          {canEdit && STATUS_COMPROMISSO[c.status].aberto && c.data <= t && (
            <Button size="icon-xs" variant="ghost" title="Marcar como realizado" aria-label="Marcar como realizado" onClick={() => void setAgendaStatus(c.id, "realizado")}>
              <Check className="text-ok" />
            </Button>
          )}
          {canEdit && (
            <Button size="icon-xs" variant="ghost" className="hidden opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:inline-flex" title="Editar" aria-label="Editar compromisso" onClick={() => setDialog({ kind: "agenda", agendaId: c.id })}>
              <Pencil />
            </Button>
          )}
          <AcoesCompromisso c={c} />
        </div>
      </div>
    </li>
  );
}
