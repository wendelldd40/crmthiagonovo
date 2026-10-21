"use client";
import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useCRM } from "@/lib/store";
import {
  CAMPOS, MODELO_CSV, STATUS_LABEL, celulaTexto, indiceExistentes, leadDaLinha, lerCSV, mapearCabecalhos, montarLinhas,
  type CampoImport, type Destino, type Mapeamento, type StatusLinha,
} from "@/lib/importacao";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Notice } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/segmented";
import { BarraImportar, DestinoCampos, destinoInicial } from "./importar-destino";

const MAX_LINHAS = 3000;

const COR: Record<StatusLinha, string> = {
  ok: "#16a34a", sem_nome: "#e11d48", telefone_invalido: "#e11d48", sem_contato: "#e11d48", duplicado_arquivo: "#d97706", ja_no_crm: "var(--ink-3)",
};

function baixarModelo() {
  const url = URL.createObjectURL(new Blob([MODELO_CSV], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-importar-leads.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function lerArquivo(file: File): Promise<string[][]> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) return lerCSV(await file.text());
  if (nome.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const linhas = await readSheet(file);
    return linhas.map((r) => r.map(celulaTexto));
  }
  if (nome.endsWith(".xls")) throw new Error("Arquivo .xls antigo: no Excel, use Salvar como → Pasta de Trabalho do Excel (.xlsx) ou CSV.");
  throw new Error("Envie um arquivo .xlsx ou .csv.");
}

export function ImportarPlanilha() {
  const { funnels, leads, importLeads } = useCRM();
  const input = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [dados, setDados] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Mapeamento>({});
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "ok" | "problema">("todos");
  const [arrastando, setArrastando] = useState(false);
  const [destino, setDestino] = useState<Destino>(() => destinoInicial(funnels, "lista", /frio|prospec/i));

  const linhas = useMemo(() => (dados ? montarLinhas(dados, map, indiceExistentes(leads)) : []), [dados, map, leads]);
  const conta = useMemo(() => {
    const c: Partial<Record<StatusLinha, number>> = {};
    for (const l of linhas) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [linhas]);
  const prontas = linhas.filter((l) => l.status === "ok");
  const mostradas = linhas.filter((l) => filtro === "todos" || (filtro === "ok" ? l.status === "ok" : l.status !== "ok"));

  async function abrir(file: File | undefined) {
    if (!file) return;
    setErro(null); setLendo(true);
    try {
      const d = await lerArquivo(file);
      if (d.length < 2) throw new Error("A planilha está vazia ou só tem o cabeçalho.");
      if (d.length - 1 > MAX_LINHAS) throw new Error(`A planilha tem ${d.length - 1} linhas. Divida em arquivos de até ${MAX_LINHAS}.`);
      const m = mapearCabecalhos(d[0]);
      setDados(d); setMap(m); setArquivo(file.name); setFiltro("todos");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
      if (input.current) input.current.value = "";
    }
  }

  const cabecalhos = dados?.[0] ?? [];
  const faltaNome = map.nome == null && map.empresa == null;
  const faltaContato = map.telefone == null && map.email == null && map.instagram == null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="Importar planilha" subtitle="Excel (.xlsx) ou CSV. A primeira linha precisa ser o cabeçalho.">
          <Button size="sm" variant="secondary" onClick={baixarModelo}><Download /> Baixar modelo</Button>
        </CardHead>
        <div className="space-y-4 px-5 pb-5">
          {!dados ? (
            <button type="button" onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); void abrir(e.dataTransfer.files[0]); }}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${arrastando ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong hover:bg-surface-2"}`}>
              {lendo ? <Loader2 className="size-7 animate-spin text-ink-3" /> : <Upload className="size-7 text-ink-3" />}
              <span className="font-semibold text-ink">Arraste a planilha aqui ou clique para escolher</span>
              <span className="text-[13px] text-ink-3">Colunas reconhecidas: nome, WhatsApp/telefone, e-mail, clínica, Instagram, cidade, observações, valor</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
              <FileSpreadsheet className="size-5 text-[#0f9d58]" />
              <p className="flex-1 text-[14px]"><b>{arquivo}</b> <span className="text-ink-3">· {linhas.length} linhas</span></p>
              <Button size="sm" variant="ghost" onClick={() => { setDados(null); setArquivo(null); setMap({}); }}><X /> Trocar arquivo</Button>
            </div>
          )}
          <input ref={input} type="file" accept=".xlsx,.csv,.txt,.xls" className="hidden" onChange={(e) => void abrir(e.target.files?.[0])} />
          {erro && <Notice tone="coral">{erro}</Notice>}

          {dados && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-2">Qual coluna é qual</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {CAMPOS.map((c) => (
                    <Field key={c.key} label={c.label}>
                      <Select value={map[c.key] ?? ""} onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        setMap((m) => {
                          const n: Mapeamento = { ...m };
                          // uma coluna só alimenta um campo
                          if (v != null) for (const k of Object.keys(n) as CampoImport[]) if (n[k] === v) delete n[k];
                          if (v == null) delete n[c.key]; else n[c.key] = v;
                          return n;
                        });
                      }}>
                        <option value="">Não usar</option>
                        {cabecalhos.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
                      </Select>
                    </Field>
                  ))}
                </div>
                {(faltaNome || faltaContato) && (
                  <Notice tone="amber" className="mt-3">
                    {faltaNome ? "Escolha a coluna do nome (ou da clínica). " : ""}{faltaContato ? "Escolha a coluna do WhatsApp/telefone, e-mail ou Instagram." : ""}
                  </Notice>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Segmented size="sm" value={filtro} onChange={setFiltro} options={[
                  { value: "todos", label: "Todas", count: linhas.length },
                  { value: "ok", label: "Prontas", count: prontas.length },
                  { value: "problema", label: "Não entram", count: linhas.length - prontas.length },
                ]} />
                <span className="flex-1" />
                {(Object.keys(conta) as StatusLinha[]).filter((s) => s !== "ok").map((s) => <Chip key={s} color={COR[s]}>{STATUS_LABEL[s]}: {conta[s]}</Chip>)}
              </div>

              <div className="scroll-thin max-h-[440px] overflow-auto rounded-xl border border-line">
                <table className="w-full min-w-[760px] text-[13px]">
                  <thead className="sticky top-0 bg-surface-2 text-left text-[12px] font-semibold text-ink-3">
                    <tr><th className="px-3 py-2">Linha</th><th className="px-2 py-2">Nome</th><th className="px-2 py-2">WhatsApp</th><th className="px-2 py-2">E-mail / Instagram</th><th className="px-2 py-2">Clínica · cidade</th><th className="px-2 py-2">Situação</th></tr>
                  </thead>
                  <tbody>
                    {mostradas.slice(0, 300).map((l) => (
                      <tr key={l.linha} className="border-t border-line">
                        <td className="tabular px-3 py-2 text-ink-3">{l.linha}</td>
                        <td className="px-2 py-2 font-semibold">{l.nome || <span className="text-ink-3">—</span>}</td>
                        <td className="tabular px-2 py-2 whitespace-nowrap">{l.telefone || <span className="text-ink-3">—</span>}{l.tipoTel === "fixo" && <span className="ml-1 text-[11px] text-ink-3">(fixo)</span>}</td>
                        <td className="px-2 py-2">{[l.email, l.instagram].filter(Boolean).join(" · ") || <span className="text-ink-3">—</span>}</td>
                        <td className="px-2 py-2">{[l.empresa, l.cidade].filter(Boolean).join(" · ") || <span className="text-ink-3">—</span>}</td>
                        <td className="px-2 py-2"><Chip color={COR[l.status]} title={l.existente ? `Lead: ${l.existente}` : undefined}>{STATUS_LABEL[l.status]}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mostradas.length > 300 && <p className="border-t border-line px-3 py-2 text-[12px] text-ink-3">Mostrando 300 de {mostradas.length}. Todas entram na importação.</p>}
              </div>
            </>
          )}
        </div>
      </Card>

      {dados && (
        <Card>
          <CardHead title="Onde os leads entram" subtitle="Só as linhas prontas são importadas. Repetidas e as que já estão no CRM ficam de fora." />
          <div className="space-y-4 px-5 pb-5">
            <DestinoCampos value={destino} onChange={setDestino} />
            <BarraImportar total={faltaNome || faltaContato ? 0 : prontas.length} destino={destino} rotulo="Importar planilha"
              onImportar={async (progresso) => {
                const agora = new Date().toISOString();
                return importLeads(prontas.map((l) => leadDaLinha(l, destino, agora, `planilha ${arquivo ?? ""}`.trim())), progresso);
              }} />
          </div>
        </Card>
      )}
    </div>
  );
}
