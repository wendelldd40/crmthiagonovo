"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cable, Download, Plus, SearchX, X } from "lucide-react";
import { useCRM } from "@/lib/store";
import { ORIGIN_GROUPS, ORIGINS } from "@/lib/constants";
import { findFunnel, findStage } from "@/lib/domain";
import { TAG_ELO } from "@/lib/config";
import type { Lead } from "@/lib/types";
import { matches, plural, today } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, Empty } from "@/components/ui/card";
import { SearchInput, Select } from "@/components/ui/input";
import { LeadTable } from "@/components/crm/lead-table";

const PAGE = 100;

function exportCSV(leads: Lead[], funnels: ReturnType<typeof useCRM>["funnels"]) {
  const rows = [["Nome", "E-mail", "Telefone", "Instagram", "Empresa", "Funil", "Etapa", "Origem", "É Veterinário", "Convertido", "Data Conversão", "Meses Serviço", "Valor", "Tags", "Follow-up", "Data Entrada"]];
  for (const l of leads) {
    const f = findFunnel(funnels, l.funnelId);
    const s = findStage(f, l.stageId);
    rows.push([l.name, l.email, l.phone, l.instagram, l.company, f?.name ?? "", s?.name ?? "", l.origin, l.isVet ? "Sim" : "Não", l.converted ? "Sim" : "Não", l.convertedDate, String(l.serviceMonths || 0), String(l.value || 0), l.tags.join(";"), l.followUp, l.date]);
  }
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `thiagocrm-leads-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function LeadsPage() {
  const { leads, funnels, setDialog, canEdit, can, toast } = useCRM();
  const [q, setQ] = useState("");
  const [funnel, setFunnel] = useState("all");
  const [orig, setOrig] = useState("all");
  const [perfil, setPerfil] = useState("all");
  const [elo, setElo] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      leads
        .filter((l) => funnel === "all" || l.funnelId === funnel)
        .filter((l) => orig === "all" || l.origin === orig)
        .filter((l) => perfil === "all" || (perfil === "vet" ? l.isVet : perfil === "naovet" ? !l.isVet : perfil === "cliente" ? l.converted : !l.converted))
        .filter((l) => elo === "all" || (elo === "sim" ? l.tags.includes(TAG_ELO) : !l.tags.includes(TAG_ELO)))
        .filter((l) => matches(l, q))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [leads, funnel, orig, perfil, elo, q],
  );
  const filtersOn = funnel !== "all" || orig !== "all" || perfil !== "all" || elo !== "all" || !!q;

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSel((s) => (filtered.every((l) => s.has(l.id)) ? new Set() : new Set(filtered.map((l) => l.id))));
  }
  const selected = filtered.filter((l) => sel.has(l.id));

  return (
    <>
      <PageHeader title="Leads" subtitle={filtersOn ? `${plural(filtered.length, "lead encontrado", "leads encontrados")} de ${leads.length}` : plural(leads.length, "lead no CRM", "leads no CRM")}>
        <Button variant="secondary" size="sm" onClick={() => { exportCSV(filtered, funnels); toast("CSV exportado"); }}><Download /> Exportar CSV</Button>
        {canEdit && <Button size="sm" onClick={() => setDialog({ kind: "lead" })}><Plus /> Novo lead</Button>}
      </PageHeader>

      <PageBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder="Nome, @, clínica, e-mail ou telefone" className="w-full sm:w-72" />
          <Select value={funnel} onChange={(e) => setFunnel(e.target.value)} className="w-full sm:w-52">
            <option value="all">Todos os funis</option>
            {funnels.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
          </Select>
          <Select value={orig} onChange={(e) => setOrig(e.target.value)} className="w-[calc(50%-4px)] sm:w-44">
            <option value="all">Qualquer origem</option>
            {ORIGIN_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.keys.map((k) => <option key={k} value={k}>{ORIGINS[k].label}</option>)}
              </optgroup>
            ))}
          </Select>
          <Select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-[calc(50%-4px)] sm:w-40">
            <option value="all">Qualquer perfil</option>
            <option value="vet">Veterinários</option>
            <option value="naovet">Não veterinários</option>
            <option value="cliente">Já são clientes</option>
            <option value="aberto">Ainda não fecharam</option>
          </Select>
          {can("elo") && (
            <Select value={elo} onChange={(e) => setElo(e.target.value)} className="w-[calc(50%-4px)] sm:w-36">
              <option value="all">Elo: todos</option>
              <option value="sim">Já no Elo</option>
              <option value="nao">Fora do Elo</option>
            </Select>
          )}
          {filtersOn && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setFunnel("all"); setOrig("all"); setPerfil("all"); setElo("all"); }}>
              <X /> Limpar filtros
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {filtered.length ? (
            <>
              <LeadTable leads={filtered.slice(0, limit)} q={q} selectable={canEdit} selected={sel} onToggle={toggle} onToggleAll={toggleAll} />
              {filtered.length > limit && (
                <button onClick={() => setLimit((n) => n + PAGE)} className="w-full border-t border-line py-3 text-[13px] font-semibold text-brand hover:bg-surface-2">
                  Mostrar mais {Math.min(PAGE, filtered.length - limit)} de {filtered.length - limit} restantes
                </button>
              )}
            </>
          ) : (
            <Empty icon={SearchX} title="Nenhum lead com esses filtros">Tente outro termo ou limpe os filtros.</Empty>
          )}
        </Card>
      </PageBody>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-navy p-2 pl-4 text-navy-ink shadow-pop ring-1 ring-white/10 md:bottom-6 md:left-[248px] md:right-0"
          >
            <span className="flex-1 text-[13.5px] font-semibold">{plural(selected.length, "lead selecionado", "leads selecionados")}</span>
            <Button size="sm" variant="ghost" className="text-navy-ink hover:bg-white/10 hover:text-white" onClick={() => exportCSV(selected, funnels)}><Download /> CSV</Button>
            {can("elo") && <Button size="sm" onClick={() => setDialog({ kind: "elo", leadIds: selected.map((l) => l.id) })}><Cable /> Enviar ao Elo</Button>}
            <Button size="icon-sm" variant="ghost" className="text-navy-ink-2 hover:bg-white/10 hover:text-white" onClick={() => setSel(new Set())} aria-label="Limpar seleção"><X /></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
