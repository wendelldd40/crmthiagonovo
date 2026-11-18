"use client";
import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Plus, Smartphone, TriangleAlert } from "lucide-react";
import { useCRM } from "@/lib/store";
import { MONTHS_LONG, STATUS_COMPROMISSO, STATUS_ORDEM, TIPO_ORDEM, TIPOS_COMPROMISSO, WEEKDAYS, statusDef, tipoDef } from "@/lib/constants";
import { agendaDoDia, compromissosPendentes, gradeDoMes, porDataHora, proximosCompromissos, quandoLabel, resumoAgenda } from "@/lib/domain";
import type { StatusCompromisso, TipoCompromisso } from "@/lib/types";
import { cn, fmtDate, fmtMoney, pct, today } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Empty } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/input";
import { LinhaCompromisso } from "@/components/crm/agenda-bits";
import { SincronizarCelular } from "@/components/crm/agenda-sync";

type Visao = "proximos" | "mes" | "tudo";

function Kpi({ label, valor, sub, cor, icone: Icone }: { label: string; valor: React.ReactNode; sub?: string; cor: string; icone?: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium leading-snug text-ink-3 md:text-[12.5px]">{label}</p>
        {Icone && (
          <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${cor} 13%, transparent)`, color: cor }}>
            <Icone className="size-3.5" />
          </span>
        )}
      </div>
      <p className="tabular mt-1.5 font-display text-[26px] font-semibold leading-none tracking-tight md:text-[30px]" style={{ color: cor }}>
        {valor}
      </p>
      {sub && <p className="mt-1 text-[11.5px] leading-snug text-ink-3 md:text-[12px]">{sub}</p>}
    </Card>
  );
}

export default function AgendaPage() {
  const { agenda, setDialog, canEdit } = useCRM();
  const t = today();
  const hojeDate = new Date(t + "T00:00:00");

  const [visao, setVisao] = useState<Visao>("proximos");
  const [tipo, setTipo] = useState<TipoCompromisso | "todos">("todos");
  const [status, setStatus] = useState<StatusCompromisso | "todos">("todos");
  const [responsavel, setResponsavel] = useState("todos");
  const [marcador, setMarcador] = useState("todos");
  const [cursor, setCursor] = useState({ ano: hojeDate.getFullYear(), mes: hojeDate.getMonth() });
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const pessoas = useMemo(() => {
    const resp = new Set<string>();
    const marc = new Set<string>();
    for (const c of agenda) {
      if (c.responsavelNome) resp.add(c.responsavelNome);
      if (c.marcadoPorNome) marc.add(c.marcadoPorNome);
    }
    return { resp: [...resp].sort(), marc: [...marc].sort() };
  }, [agenda]);

  const filtrada = useMemo(
    () =>
      agenda.filter(
        (c) =>
          (tipo === "todos" || c.tipo === tipo) &&
          (status === "todos" || c.status === status) &&
          (responsavel === "todos" || c.responsavelNome === responsavel) &&
          (marcador === "todos" || c.marcadoPorNome === marcador),
      ),
    [agenda, tipo, status, responsavel, marcador],
  );

  const doMes = useMemo(
    () => filtrada.filter((c) => c.data.startsWith(`${cursor.ano}-${String(cursor.mes + 1).padStart(2, "0")}`)),
    [filtrada, cursor],
  );

  const resumo = useMemo(() => resumoAgenda(doMes), [doMes]);
  const grade = useMemo(() => gradeDoMes(cursor.ano, cursor.mes, filtrada), [cursor, filtrada]);
  const proximos = useMemo(() => proximosCompromissos(filtrada, 60, t), [filtrada, t]);
  const pendentes = useMemo(() => compromissosPendentes(filtrada, t), [filtrada, t]);
  const hoje = useMemo(() => agendaDoDia(filtrada, t), [filtrada, t]);
  const doDiaAberto = useMemo(() => (diaAberto ? agendaDoDia(filtrada, diaAberto) : []), [filtrada, diaAberto]);
  const todos = useMemo(() => [...filtrada].sort((a, b) => porDataHora(b, a)), [filtrada]);

  const diagnosticosMes = resumo.porTipo.get("diagnostico") ?? 0;
  const reunioesMes = resumo.porTipo.get("reuniao") ?? 0;
  const mesAtual = cursor.ano === hojeDate.getFullYear() && cursor.mes === hojeDate.getMonth();
  const mover = (delta: number) => {
    const d = new Date(cursor.ano, cursor.mes + delta, 1);
    setCursor({ ano: d.getFullYear(), mes: d.getMonth() });
  };

  return (
    <>
      <PageHeader title="Agenda" subtitle="Diagnósticos, reuniões e sessões — com quem marcou cada um">
        <SincronizarCelular />
        {canEdit && (
          <Button size="sm" onClick={() => setDialog({ kind: "agenda" })}>
            <Plus /> Marcar
          </Button>
        )}
      </PageHeader>

      <PageBody className="space-y-5">
        {/* ── Números do mês que está sendo visto ── */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label={`Diagnósticos em ${MONTHS_LONG[cursor.mes].toLowerCase()}`} valor={<CountUp value={diagnosticosMes} />} sub={`${reunioesMes} ${reunioesMes === 1 ? "reunião" : "reuniões"} no mesmo mês`} cor={TIPOS_COMPROMISSO.diagnostico.color} icone={TIPOS_COMPROMISSO.diagnostico.icon} />
          <Kpi label="Ainda vão acontecer" valor={<CountUp value={resumo.abertos} />} sub={`${resumo.total} marcados no mês`} cor="var(--sky)" icone={STATUS_COMPROMISSO.confirmado.icon} />
          <Kpi
            label="Comparecimento"
            valor={resumo.comparecimento == null ? "—" : `${resumo.comparecimento}%`}
            sub={resumo.comparecimento == null ? "Nenhum encerrado ainda" : `${resumo.realizados} realizados · ${resumo.faltas} faltas`}
            cor={resumo.comparecimento == null ? "var(--ink-3)" : resumo.comparecimento >= 70 ? "var(--ok)" : "var(--coral)"}
            icone={STATUS_COMPROMISSO.realizado.icon}
          />
          <Kpi label="Receita dos realizados" valor={fmtMoney(resumo.receita)} sub="Soma do valor dos compromissos do mês" cor="var(--brand-strong)" icone={TIPOS_COMPROMISSO.mentoria.icon} />
        </div>

        {/* ── Quem marcou: a pergunta direta do dia a dia ── */}
        {resumo.porPessoa.length > 0 && (
          <Card>
            <CardHead title="Quem marcou" subtitle={`Compromissos de ${MONTHS_LONG[cursor.mes].toLowerCase()} de ${cursor.ano}, por quem registrou`} />
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:flex sm:flex-wrap">
              {resumo.porPessoa.map(([nome, n]) => (
                <button
                  key={nome}
                  type="button"
                  onClick={() => setMarcador(marcador === nome ? "todos" : nome)}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors sm:px-3",
                    marcador === nome ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[12px] font-bold text-ink-2">{nome.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{nome}</span>
                    <span className="block text-[11.5px] text-ink-3">{n} {n === 1 ? "marcado" : "marcados"} · {pct(n, resumo.total)}%</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ── Cobrança: passou da data e ninguém deu baixa ── */}
        {pendentes.length > 0 && (
          <Card className="overflow-hidden border-coral/30">
            <CardHead
              title={<span className="flex items-center gap-2"><TriangleAlert className="size-4 text-coral" /> Sem baixa</span>}
              subtitle={`${pendentes.length} ${pendentes.length === 1 ? "compromisso já passou" : "compromissos já passaram"} e continuam como agendados. Marque o que aconteceu.`}
            />
            <ul className="divide-y divide-line border-t border-line">
              {pendentes.slice(0, 6).map((c) => <LinhaCompromisso key={c.id} c={c} />)}
            </ul>
          </Card>
        )}

        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={visao}
            onChange={setVisao}
            options={[
              { value: "proximos", label: "Próximos", count: proximos.length },
              { value: "mes", label: "Mês" },
              { value: "tudo", label: "Tudo", count: filtrada.length },
            ]}
          />
          {/* no celular os selects dividem a linha; no desktop seguem o fluxo */}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <Select className="w-full min-w-0 sm:w-auto" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCompromisso | "todos")} aria-label="Filtrar por tipo">
              <option value="todos">Todos os tipos</option>
              {TIPO_ORDEM.map((k) => <option key={k} value={k}>{TIPOS_COMPROMISSO[k].label}</option>)}
            </Select>
            <Select className="w-full min-w-0 sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value as StatusCompromisso | "todos")} aria-label="Filtrar por situação">
              <option value="todos">Qualquer situação</option>
              {STATUS_ORDEM.map((k) => <option key={k} value={k}>{STATUS_COMPROMISSO[k].label}</option>)}
            </Select>
            {pessoas.resp.length > 1 && (
              <Select className="w-full min-w-0 sm:w-auto" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Filtrar por responsável">
                <option value="todos">Qualquer responsável</option>
                {pessoas.resp.map((n) => <option key={n} value={n}>Conduz: {n}</option>)}
              </Select>
            )}
            {pessoas.marc.length > 1 && (
              <Select className="w-full min-w-0 sm:w-auto" value={marcador} onChange={(e) => setMarcador(e.target.value)} aria-label="Filtrar por quem marcou">
                <option value="todos">Marcado por qualquer um</option>
                {pessoas.marc.map((n) => <option key={n} value={n}>Marcado por: {n}</option>)}
              </Select>
            )}
            {(tipo !== "todos" || status !== "todos" || responsavel !== "todos" || marcador !== "todos") && (
              <Button size="sm" variant="ghost" className="col-span-2 sm:col-auto" onClick={() => { setTipo("todos"); setStatus("todos"); setResponsavel("todos"); setMarcador("todos"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* ── Próximos ── */}
        {visao === "proximos" && (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="overflow-hidden">
              <CardHead title="Próximos compromissos" subtitle={proximos.length ? `${proximos.length} nos próximos 60 dias` : "Nada marcado daqui para a frente"} />
              {proximos.length ? (
                <ul className="divide-y divide-line border-t border-line">
                  {proximos.map((c) => <LinhaCompromisso key={c.id} c={c} />)}
                </ul>
              ) : (
                <Empty icon={CalendarDays} title="Agenda livre">
                  {canEdit ? "Marque um diagnóstico ou reunião para ele aparecer aqui e no celular da equipe." : "Nada marcado para os próximos dias."}
                </Empty>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="overflow-hidden">
                <CardHead title="Hoje" subtitle={fmtDate(t)} />
                {hoje.length ? (
                  <ul className="divide-y divide-line border-t border-line">
                    {hoje.map((c) => <LinhaCompromisso key={c.id} c={c} mostrarData={false} />)}
                  </ul>
                ) : (
                  <Empty icon={CalendarCheckVazio} title="Nada para hoje" />
                )}
              </Card>

              <Card>
                <CardHead title="Por tipo" subtitle={`Em ${MONTHS_LONG[cursor.mes].toLowerCase()} de ${cursor.ano}`} />
                <ul className="space-y-2 px-5 pb-5">
                  {TIPO_ORDEM.map((k) => {
                    const def = TIPOS_COMPROMISSO[k];
                    const n = resumo.porTipo.get(k) ?? 0;
                    const Icon = def.icon;
                    return (
                      <li key={k} className="flex items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${def.color} 13%, transparent)`, color: def.color }}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="flex-1 text-[13px] text-ink-2">{def.label}</span>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken">
                          <span className="block h-full rounded-full" style={{ width: `${pct(n, resumo.total || 1)}%`, background: def.color }} />
                        </span>
                        <span className="tabular w-6 text-right text-[13px] font-semibold text-ink">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* ── Calendário do mês ── */}
        {visao === "mes" && (
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card className="overflow-hidden">
              <CardHead title={`${MONTHS_LONG[cursor.mes]} de ${cursor.ano}`} subtitle={`${doMes.length} ${doMes.length === 1 ? "compromisso" : "compromissos"} no mês`}>
                <div className="flex items-center gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => mover(-1)} aria-label="Mês anterior"><ChevronLeft /></Button>
                  {!mesAtual && <Button size="sm" variant="secondary" onClick={() => setCursor({ ano: hojeDate.getFullYear(), mes: hojeDate.getMonth() })}>Hoje</Button>}
                  <Button size="icon-sm" variant="ghost" onClick={() => mover(1)} aria-label="Próximo mês"><ChevronRight /></Button>
                </div>
              </CardHead>

              <div className="border-t border-line px-3 pb-4 pt-3">
                <div className="grid grid-cols-7 gap-1 pb-1">
                  {WEEKDAYS.map((d) => <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {grade.map((cel) => {
                    const ehHoje = cel.iso === t;
                    const selecionado = cel.iso === diaAberto;
                    return (
                      <button
                        key={cel.iso}
                        type="button"
                        onClick={() => setDiaAberto(selecionado ? null : cel.iso)}
                        onDoubleClick={() => canEdit && setDialog({ kind: "agenda", data: cel.iso })}
                        className={cn(
                          "flex min-h-[52px] flex-col gap-1 rounded-xl border p-1 text-left transition-colors md:min-h-[74px] md:p-1.5",
                          cel.doMes ? "border-line bg-surface hover:border-line-strong" : "border-transparent bg-sunken/40 text-ink-3",
                          selecionado && "border-brand ring-2 ring-brand/20",
                        )}
                      >
                        <span className={cn("tabular grid size-6 place-items-center rounded-md text-[12px] font-semibold", ehHoje ? "bg-brand text-brand-ink" : cel.doMes ? "text-ink-2" : "text-ink-3")}>
                          {cel.dia}
                        </span>

                        {/* celular: pontinhos, porque o nome não cabe em 7 colunas */}
                        <span className="flex flex-wrap gap-0.5 px-0.5 md:hidden">
                          {cel.itens.slice(0, 4).map((c) => (
                            <span key={c.id} className={cn("size-1.5 rounded-full", !STATUS_COMPROMISSO[c.status].aberto && "opacity-50")} style={{ background: tipoDef(c.tipo).color }} />
                          ))}
                        </span>

                        <span className="hidden flex-1 flex-col gap-0.5 overflow-hidden md:flex">
                          {cel.itens.slice(0, 3).map((c) => {
                            const def = tipoDef(c.tipo);
                            const fechado = !STATUS_COMPROMISSO[c.status].aberto;
                            return (
                              <span
                                key={c.id}
                                className={cn("flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10.5px] font-medium leading-tight", fechado && "opacity-55")}
                                style={{ background: `color-mix(in oklab, ${def.color} 14%, transparent)`, color: def.color }}
                                title={`${c.hora ? c.hora + " · " : ""}${c.titulo}${c.leadNome ? ` — ${c.leadNome}` : ""} · ${statusDef(c.status).label}`}
                              >
                                {c.hora && <span className="tabular shrink-0 opacity-80">{c.hora.slice(0, 5)}</span>}
                                <span className="truncate">{c.leadNome || c.titulo}</span>
                              </span>
                            );
                          })}
                          {cel.itens.length > 3 && <span className="px-1 text-[10.5px] text-ink-3">+{cel.itens.length - 3}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="px-1 pt-3 text-[12px] text-ink-3">Toque num dia para ver a lista. <span className="hidden md:inline">{canEdit && "Dois cliques marcam um compromisso nessa data."}</span></p>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHead
                title={diaAberto ? fmtDate(diaAberto) : "Escolha um dia"}
                subtitle={diaAberto ? `${quandoLabel(diaAberto, t) ?? ""} ${doDiaAberto.length ? `· ${doDiaAberto.length} ${doDiaAberto.length === 1 ? "compromisso" : "compromissos"}` : ""}`.trim() : "Clique numa data do calendário"}
              >
                {diaAberto && canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "agenda", data: diaAberto })}>
                    <CalendarPlus /> Marcar
                  </Button>
                )}
              </CardHead>
              {diaAberto && doDiaAberto.length ? (
                <ul className="divide-y divide-line border-t border-line">
                  {doDiaAberto.map((c) => <LinhaCompromisso key={c.id} c={c} mostrarData={false} />)}
                </ul>
              ) : (
                <Empty icon={CalendarDays} title={diaAberto ? "Nada marcado nesse dia" : "Nenhum dia selecionado"} />
              )}
            </Card>
          </div>
        )}

        {/* ── Tudo ── */}
        {visao === "tudo" && (
          <Card className="overflow-hidden">
            <CardHead title="Todos os compromissos" subtitle={`${filtrada.length} no total, do mais recente para o mais antigo`} />
            {filtrada.length ? (
              <ul className="divide-y divide-line border-t border-line">
                {todos.map((c) => <LinhaCompromisso key={c.id} c={c} />)}
              </ul>
            ) : (
              <Empty icon={CalendarDays} title="Nenhum compromisso com esses filtros" />
            )}
          </Card>
        )}

        <Card className="flex flex-wrap items-center gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Smartphone className="size-4" /></span>
          <p className="min-w-[220px] flex-1 text-[13px] text-ink-2">
            Dá para abrir esta agenda no celular: o calendário do telefone busca sozinho o que a equipe marca aqui.
          </p>
          <SincronizarCelular variante="secondary" rotulo="Como colocar no celular" />
        </Card>
      </PageBody>
    </>
  );
}

/** Ícone do vazio de hoje — separado só para não repetir o import. */
function CalendarCheckVazio({ className }: { className?: string }) {
  const Icon = STATUS_COMPROMISSO.realizado.icon;
  return <Icon className={className} />;
}
