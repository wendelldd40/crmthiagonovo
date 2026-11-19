"use client";
import { useMemo } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { mesAtual, mesCurto, mesDistancia, mesLabel, mesRelativo, mesSoma } from "@/lib/meses";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

/** "tudo" significa sem recorte de mês — o comportamento antigo do CRM. */
export const TUDO = "tudo";

/** Meses que têm lead, do mais novo para o mais antigo, sempre incluindo o mês atual. */
export function useMesesComLead(leads: Lead[], filtro?: (l: Lead) => boolean) {
  return useMemo(() => {
    const conta = new Map<string, number>();
    for (const l of leads) {
      if (!l.mesRef || (filtro && !filtro(l))) continue;
      conta.set(l.mesRef, (conta.get(l.mesRef) ?? 0) + 1);
    }
    const hoje = mesAtual();
    if (!conta.has(hoje)) conta.set(hoje, 0);
    return [...conta.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [leads, filtro]);
}

interface Props {
  mes: string;
  onChange: (mes: string) => void;
  /** Meses com lead e quantos, de useMesesComLead. */
  meses: [string, number][];
  /** Quantos leads em aberto ficaram em meses anteriores a este. */
  pendentes?: number;
  onPuxar?: () => void;
  className?: string;
}

/**
 * Navegação por mês. As setas andam mês a mês; o nome abre a lista de meses que
 * têm lead, para pular direto. "Tudo" volta ao quadro sem recorte.
 */
export function SeletorMes({ mes, onChange, meses, pendentes = 0, onPuxar, className }: Props) {
  const tudo = mes === TUDO;
  const hoje = mesAtual();
  const noMes = meses.find(([m]) => m === mes)?.[1] ?? 0;
  const total = meses.reduce((a, [, n]) => a + n, 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center rounded-xl border border-line bg-surface">
        <Button
          size="icon-xs"
          variant="ghost"
          className="rounded-l-xl rounded-r-none"
          aria-label="Mês anterior"
          disabled={tudo}
          onClick={() => onChange(mesSoma(mes, -1))}
        >
          <ChevronLeft />
        </Button>

        <Menu>
          <MenuTrigger asChild>
            <button className="flex h-8 min-w-[9.5rem] items-center justify-center gap-1.5 px-2 text-[13px] font-semibold text-ink hover:bg-sunken">
              <CalendarRange className="size-3.5 text-ink-3" />
              {tudo ? "Todos os meses" : mesLabel(mes)}
            </button>
          </MenuTrigger>
          <MenuContent align="center" className="max-h-[22rem] w-60 overflow-y-auto">
            <MenuItem onSelect={() => onChange(hoje)}>
              Este mês <span className="ml-auto text-ink-3">{mesCurto(hoje)}</span>
            </MenuItem>
            <MenuItem onSelect={() => onChange(TUDO)}>
              Todos os meses <span className="tabular ml-auto text-ink-3">{total}</span>
            </MenuItem>
            <MenuSeparator />
            {meses.map(([m, n]) => (
              <MenuItem key={m} onSelect={() => onChange(m)} className={cn(m === mes && "bg-brand-soft")}>
                <span className={cn(m === hoje && "font-semibold text-brand-strong")}>{mesLabel(m)}</span>
                <span className="tabular ml-auto text-ink-3">{n}</span>
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>

        <Button
          size="icon-xs"
          variant="ghost"
          className="rounded-l-none rounded-r-xl"
          aria-label="Próximo mês"
          disabled={tudo}
          onClick={() => onChange(mesSoma(mes, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {!tudo && (
        <span className="text-[12.5px] text-ink-3">
          {mes === hoje ? `${noMes} no mês` : `${noMes} em ${mesRelativo(mes)}`}
          {mesDistancia(hoje, mes) > 0 && " · mês futuro"}
        </span>
      )}

      {!tudo && pendentes > 0 && onPuxar && (
        <Button size="sm" variant="secondary" onClick={onPuxar}>
          Trazer {pendentes} {pendentes === 1 ? "pendente" : "pendentes"}
        </Button>
      )}
    </div>
  );
}
