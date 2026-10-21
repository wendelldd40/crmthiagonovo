"use client";
import { useMemo, useState } from "react";
import { ExternalLink, Globe, Loader2, MapPinned, Phone, Search, Smartphone, Star } from "lucide-react";
import { backend, useCRM } from "@/lib/store";
import { IS_DEMO } from "@/lib/config";
import {
  TIPOS_BUSCA, cidadeDoEndereco, indiceExistentes, leadDoGoogle, type Destino, type LugarGoogle, type TipoBusca,
} from "@/lib/importacao";
import { normalize, variantesTelefone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Empty, Notice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { BarraImportar, DestinoCampos, destinoInicial } from "./importar-destino";

type Status = "novo" | "ja_no_crm" | "talvez";

export function ImportarGoogle() {
  const { funnels, leads, importLeads } = useCRM();
  const [regiao, setRegiao] = useState("");
  const [tipos, setTipos] = useState<TipoBusca[]>(["clinicas", "hospitais"]);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState<{ regiao: string; tipos: TipoBusca[]; termo: string } | null>(null);
  const [lugares, setLugares] = useState<LugarGoogle[]>([]);
  const [paginas, setPaginas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [soCelular, setSoCelular] = useState(false);
  const [destino, setDestino] = useState<Destino>(() => destinoInicial(funnels, "google_maps", /prospec/i));

  // o que já está no CRM: telefone (com e sem o 9) ou o mesmo nome
  const status = useMemo(() => {
    const idx = indiceExistentes(leads);
    const nomes = new Set(leads.flatMap((l) => [l.name, l.company]).filter(Boolean).map((n) => normalize(n).trim()));
    const m = new Map<string, Status>();
    for (const l of lugares) {
      if (l.tel && variantesTelefone(l.tel).some((v) => idx.tel.has(v))) m.set(l.id, "ja_no_crm");
      else if (nomes.has(normalize(l.nome).trim())) m.set(l.id, "talvez");
      else m.set(l.id, "novo");
    }
    return m;
  }, [lugares, leads]);

  const visiveis = useMemo(() => lugares.filter((l) => !soCelular || l.tipoTel === "celular"), [lugares, soCelular]);
  const escolhidos = visiveis.filter((l) => sel.has(l.id));

  async function chamar(corpo: Record<string, unknown>) {
    const token = await backend.accessToken();
    const res = await fetch("/api/prospeccao/google", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token ?? ""}`, "x-crm-demo": IS_DEMO ? "1" : "0" },
      body: JSON.stringify(corpo),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`);
    return json as { lugares: LugarGoogle[]; paginas: Record<string, string>; aviso?: string };
  }

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const b = { regiao: regiao.trim(), tipos, termo: termo.trim() };
    if (b.regiao.length < 3) return setErro("Informe a cidade ou região.");
    if (!b.tipos.length && !b.termo) return setErro("Escolha pelo menos um tipo de negócio.");
    setCarregando(true); setErro(null); setAviso(null);
    try {
      const r = await chamar(b);
      setBusca(b);
      setLugares(r.lugares);
      setPaginas(r.paginas);
      setAviso(r.aviso ?? null);
      // já deixa marcados os novos que têm telefone
      const idx = indiceExistentes(leads);
      setSel(new Set(r.lugares.filter((l) => l.tel && !variantesTelefone(l.tel).some((v) => idx.tel.has(v))).map((l) => l.id)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMais() {
    if (!busca) return;
    setCarregando(true); setErro(null);
    try {
      const r = await chamar({ ...busca, paginas });
      const ids = new Set(lugares.map((l) => l.id));
      const novos = r.lugares.filter((l) => !ids.has(l.id));
      setLugares((ls) => [...ls, ...novos]);
      setPaginas(r.paginas);
      const idx = indiceExistentes(leads);
      setSel((s) => new Set([...s, ...novos.filter((l) => l.tel && !variantesTelefone(l.tel).some((v) => idx.tel.has(v))).map((l) => l.id)]));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setCarregando(false);
    }
  }

  const alternar = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todosMarcados = visiveis.length > 0 && visiveis.every((l) => sel.has(l.id) || status.get(l.id) === "ja_no_crm");
  const novos = visiveis.filter((l) => status.get(l.id) !== "ja_no_crm");

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="Buscar no Google Maps" subtitle="Negócios veterinários de uma cidade ou região, com telefone, site e avaliação." />
        <form onSubmit={buscar} className="space-y-4 px-5 pb-5">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <Field label="Cidade ou região" hint="Ex.: Aracaju - SE · Zona Sul, São Paulo · Feira de Santana - BA">
              <Input value={regiao} onChange={(e) => setRegiao(e.target.value)} placeholder="Aracaju - SE" autoFocus />
            </Field>
            <Field label="Outro termo (opcional)" hint="Só entram resultados de atendimento veterinário ou pet.">
              <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="ex.: laboratório veterinário" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIPOS_BUSCA.map((t) => {
              const on = tipos.includes(t.key);
              return (
                <button key={t.key} type="button" aria-pressed={on}
                  onClick={() => setTipos((ts) => (on ? ts.filter((x) => x !== t.key) : [...ts, t.key]))}
                  className={on ? "h-8 rounded-lg border border-brand bg-brand-soft px-3 text-[13px] font-semibold text-brand-strong" : "h-8 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink-3 hover:text-ink-2"}>
                  {t.label}
                </button>
              );
            })}
            <span className="flex-1" />
            <Button type="submit" disabled={carregando}>{carregando && !lugares.length ? <Loader2 className="animate-spin" /> : <Search />} Buscar</Button>
          </div>
          {erro && <Notice tone="coral">{erro}</Notice>}
          {aviso && <Notice tone="amber">Parte da busca falhou: {aviso}</Notice>}
        </form>
      </Card>

      {busca && (
        <Card className="overflow-hidden">
          <CardHead
            title={`${lugares.length} ${lugares.length === 1 ? "resultado" : "resultados"} em ${busca.regiao}`}
            subtitle={`${novos.length} fora do CRM · ${lugares.filter((l) => l.tipoTel === "celular").length} com celular (WhatsApp provável)`}
          >
            <label className="flex items-center gap-2 text-[13px] text-ink-2"><Switch checked={soCelular} onCheckedChange={setSoCelular} /> Só celular</label>
          </CardHead>
          {!visiveis.length ? (
            <Empty icon={MapPinned} title="Nada encontrado">Tente outra região, outro tipo ou desligue “Só celular”.</Empty>
          ) : (
            <div className="scroll-thin max-h-[560px] overflow-auto border-t border-line">
              <table className="w-full min-w-[760px] text-[13.5px]">
                <thead className="sticky top-0 z-10 bg-surface-2 text-left text-[12px] font-semibold text-ink-3">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input type="checkbox" aria-label="Marcar todos" checked={todosMarcados}
                        onChange={() => setSel(todosMarcados ? new Set() : new Set(novos.map((l) => l.id)))} className="size-4 accent-[var(--brand)]" />
                    </th>
                    <th className="px-2 py-2.5">Negócio</th>
                    <th className="px-2 py-2.5">Telefone</th>
                    <th className="px-2 py-2.5">Avaliação</th>
                    <th className="px-2 py-2.5">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => {
                    const st = status.get(l.id);
                    const no = st === "ja_no_crm";
                    return (
                      <tr key={l.id} className={no ? "border-t border-line opacity-55" : "border-t border-line hover:bg-surface-2"}>
                        <td className="px-4 py-2.5 align-top">
                          <input type="checkbox" disabled={no} checked={sel.has(l.id)} onChange={() => alternar(l.id)} aria-label={`Selecionar ${l.nome}`} className="size-4 accent-[var(--brand)]" />
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          <p className="font-semibold text-ink">{l.nome}</p>
                          <p className="text-[12px] text-ink-3">{cidadeDoEndereco(l.endereco) || l.endereco}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Chip color={l.tipos.includes("pet_store") && !l.tipos.includes("veterinary_care") ? "#f97316" : "#2d9d8f"}>
                              {l.tipos.includes("veterinary_care") ? "Veterinário" : l.tipos.includes("pet_store") ? "Pet shop" : "Outro"}
                            </Chip>
                            {no && <Chip color="var(--ink-3)">Já no CRM</Chip>}
                            {st === "talvez" && <Chip color="#d97706" title="Já existe lead com este nome; confira antes de importar">Nome parecido no CRM</Chip>}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          {l.telefone ? (
                            <>
                              <p className="tabular whitespace-nowrap">{l.telefone}</p>
                              {l.tipoTel === "celular" ? <Chip color="#16a34a"><Smartphone /> Celular</Chip> : <Chip color="var(--ink-3)" title="Fixo: pode não ter WhatsApp"><Phone /> Fixo</Chip>}
                            </>
                          ) : <span className="text-ink-3">Sem telefone</span>}
                        </td>
                        <td className="px-2 py-2.5 align-top whitespace-nowrap">
                          {l.nota != null ? <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-[#f5b301] text-[#f5b301]" /> {l.nota.toFixed(1)} <span className="text-ink-3">({l.avaliacoes})</span></span> : <span className="text-ink-3">—</span>}
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          <div className="flex gap-1">
                            {l.site && <a href={l.site} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink" title="Site"><Globe className="size-4" /></a>}
                            {l.maps && <a href={l.maps} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink" title="Abrir no Google Maps"><ExternalLink className="size-4" /></a>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 text-[12px] text-ink-3">
            <span>Dados do Google Maps</span>
            <span className="flex-1" />
            {Object.keys(paginas).length > 0 && (
              <Button size="sm" variant="secondary" disabled={carregando} onClick={() => void carregarMais()}>
                {carregando ? <Loader2 className="animate-spin" /> : null} Carregar mais resultados
              </Button>
            )}
          </div>
        </Card>
      )}

      {busca && (
        <Card>
          <CardHead title="Onde os leads entram" />
          <div className="space-y-4 px-5 pb-5">
            <DestinoCampos value={destino} onChange={setDestino} />
            <BarraImportar total={escolhidos.length} destino={destino} rotulo="Importar para o CRM"
              onImportar={async (progresso) => {
                const agora = new Date().toISOString();
                const r = await importLeads(escolhidos.map((l) => leadDoGoogle(l, destino, agora)), progresso);
                setSel(new Set());
                return r;
              }} />
          </div>
        </Card>
      )}
    </div>
  );
}
