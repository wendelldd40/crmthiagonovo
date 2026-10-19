/**
 * Importação de leads: planilha (CSV/XLSX) e busca no Google Maps.
 * Funções puras — a tela só desenha o que sai daqui (e os testes cobrem tudo).
 */
import type { Lead } from "./types";
import { normalize, normalizePhone, telefoneParaCrm, tipoTelefone, today, variantesTelefone } from "./utils";
import { TAG_PLANILHA } from "./config";

/* ───────────── campos ───────────── */

export type CampoImport = "nome" | "telefone" | "email" | "empresa" | "instagram" | "cidade" | "observacoes" | "valor";

export const CAMPOS: { key: CampoImport; label: string; sinonimos: string[] }[] = [
  { key: "nome", label: "Nome", sinonimos: ["nome", "name", "contato", "responsavel", "nome do contato", "nome completo", "cliente", "lead"] },
  { key: "telefone", label: "WhatsApp / telefone", sinonimos: ["whatsapp", "whats", "zap", "telefone", "celular", "fone", "phone", "tel", "numero", "contato telefonico", "telefone 1"] },
  { key: "email", label: "E-mail", sinonimos: ["email", "e-mail", "e mail", "mail"] },
  { key: "empresa", label: "Clínica / empresa", sinonimos: ["empresa", "clinica", "clínica", "estabelecimento", "negocio", "company", "razao social", "nome fantasia", "pet shop", "hospital"] },
  { key: "instagram", label: "Instagram", sinonimos: ["instagram", "insta", "ig", "@"] },
  { key: "cidade", label: "Cidade / região", sinonimos: ["cidade", "municipio", "regiao", "bairro", "uf", "estado", "local", "localizacao"] },
  { key: "observacoes", label: "Observações", sinonimos: ["observacoes", "observacao", "obs", "notas", "nota", "comentarios", "anotacoes", "descricao"] },
  { key: "valor", label: "Valor estimado", sinonimos: ["valor", "valor estimado", "ticket", "orcamento"] },
];

export type Mapeamento = Partial<Record<CampoImport, number>>; // campo → índice da coluna

const limpar = (s: string) => normalize(s).replace(/[^a-z0-9@ ]/g, " ").replace(/\s+/g, " ").trim();

/** Adivinha qual coluna é qual pelo cabeçalho. Cada coluna é usada uma vez. */
export function mapearCabecalhos(cabecalhos: string[]): Mapeamento {
  const m: Mapeamento = {};
  const usadas = new Set<number>();
  const hs = cabecalhos.map((h) => limpar(String(h ?? "")));
  // 1ª passada: igual a um sinônimo; 2ª: contém o sinônimo
  for (const modo of ["igual", "contem"] as const) {
    for (const c of CAMPOS) {
      if (m[c.key] != null) continue;
      const i = hs.findIndex((h, idx) => !usadas.has(idx) && h && c.sinonimos.some((s) => (modo === "igual" ? h === limpar(s) : limpar(s).length > 2 && h.includes(limpar(s)))));
      if (i >= 0) { m[c.key] = i; usadas.add(i); }
    }
  }
  return m;
}

/* ───────────── leitura de CSV ───────────── */

/** CSV do Excel brasileiro usa ";"; o do Google Planilhas usa ",". Detecta pela 1ª linha. */
export function lerCSV(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const conta = (ch: string) => primeira.split(ch).length - 1;
  const sep = [";", ",", "\t"].sort((a, b) => conta(b) - conta(a))[0];
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      linhas.push(linha); // linhas vazias ficam: a numeração precisa bater com a planilha
      linha = [];
    } else campo += ch;
  }
  linha.push(campo);
  if (linha.some((c) => c.trim())) linhas.push(linha);
  while (linhas.length && !linhas[linhas.length - 1].some((c) => c.trim())) linhas.pop();
  return linhas;
}

/** Planilha → texto em todas as células (números longos de telefone não viram 5,5E+12). */
export function celulaTexto(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isInteger(v) ? v.toFixed(0) : String(v);
  if (v instanceof Date) return today(v);
  return String(v).trim();
}

/* ───────────── validação ───────────── */

export type StatusLinha = "ok" | "sem_nome" | "telefone_invalido" | "sem_contato" | "duplicado_arquivo" | "ja_no_crm";

export const STATUS_LABEL: Record<StatusLinha, string> = {
  ok: "Pronto",
  sem_nome: "Sem nome",
  telefone_invalido: "Telefone inválido",
  sem_contato: "Sem telefone, e-mail ou Instagram",
  duplicado_arquivo: "Repetido na planilha",
  ja_no_crm: "Já está no CRM",
};

export interface LinhaImport {
  linha: number; // nº da linha na planilha (para o usuário achar)
  nome: string;
  telefone: string; // como veio
  tel: string | null; // normalizado (55…)
  tipoTel: ReturnType<typeof tipoTelefone>;
  email: string;
  empresa: string;
  instagram: string;
  cidade: string;
  observacoes: string;
  valor: number;
  status: StatusLinha;
  /** lead do CRM que já tem este telefone/e-mail */
  existente?: string;
}

/** Índices de busca dos leads que já estão no CRM (telefone com e sem o 9, e e-mail). */
export function indiceExistentes(leads: Pick<Lead, "id" | "name" | "phone" | "email">[]) {
  const tel = new Map<string, string>();
  const email = new Map<string, string>();
  for (const l of leads) {
    const n = normalizePhone(l.phone);
    if (n) for (const v of variantesTelefone(n)) if (!tel.has(v)) tel.set(v, l.name);
    const e = (l.email || "").trim().toLowerCase();
    if (e && !email.has(e)) email.set(e, l.name);
  }
  return { tel, email };
}

const valorNum = (s: string) => {
  const n = Number(s.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const insta = (s: string) => {
  const t = s.trim();
  if (!t) return "";
  const m = t.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  const u = (m ? m[1] : t).replace(/^@+/, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9_.]{1,30}$/.test(u) ? `@${u}` : t;
};

/** Monta e valida as linhas. A 1ª linha da planilha é o cabeçalho. */
export function montarLinhas(dados: string[][], map: Mapeamento, existentes: ReturnType<typeof indiceExistentes>): LinhaImport[] {
  const pega = (row: string[], c: CampoImport) => (map[c] != null ? String(row[map[c]!] ?? "").trim() : "");
  const vistosTel = new Set<string>();
  const vistosEmail = new Set<string>();
  const out: LinhaImport[] = [];
  dados.slice(1).forEach((row, i) => {
    if (!row.some((c) => String(c ?? "").trim())) return; // linha vazia
    const telefone = pega(row, "telefone");
    const tel = telefone ? normalizePhone(telefone) : null;
    const email = pega(row, "email").toLowerCase();
    const empresa = pega(row, "empresa");
    const nome = pega(row, "nome") || empresa;
    const l: LinhaImport = {
      linha: i + 2, nome, telefone, tel, tipoTel: tipoTelefone(tel), email, empresa,
      instagram: insta(pega(row, "instagram")), cidade: pega(row, "cidade"), observacoes: pega(row, "observacoes"),
      valor: valorNum(pega(row, "valor")), status: "ok",
    };
    if (!nome) l.status = "sem_nome";
    else if (telefone && !tel) l.status = "telefone_invalido";
    else if (!tel && !email && !l.instagram) l.status = "sem_contato";
    else {
      const ja = (tel && variantesTelefone(tel).map((v) => existentes.tel.get(v)).find(Boolean)) || (email && existentes.email.get(email));
      if (ja) { l.status = "ja_no_crm"; l.existente = ja; }
      else if ((tel && variantesTelefone(tel).some((v) => vistosTel.has(v))) || (email && vistosEmail.has(email))) l.status = "duplicado_arquivo";
    }
    if (l.status === "ok") {
      if (tel) vistosTel.add(tel);
      if (email) vistosEmail.add(email);
    }
    out.push(l);
  });
  return out;
}

/* ───────────── destino e conversão em lead ───────────── */

export interface Destino {
  funnelId: string;
  stageId: string;
  origin: string;
  /** marca como lista de prospecção: fica fora das métricas e entra na Abordagem */
  prospeccao: boolean;
  etiquetas: string[];
}

export type LeadNovo = Omit<Lead, "id" | "elo">;

const nota = (partes: [string, string | undefined | null][]) => partes.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");

export function leadDaLinha(l: LinhaImport, d: Destino, agoraIso: string, fonte = "planilha"): LeadNovo {
  const tags = [...new Set([...(d.prospeccao ? [TAG_PLANILHA] : []), ...d.etiquetas, ...(l.cidade ? [l.cidade] : [])].map((t) => t.trim()).filter(Boolean))];
  return {
    name: l.nome, email: l.email, phone: l.tel ? telefoneParaCrm(l.tel) : "", instagram: l.instagram, company: l.empresa,
    origin: d.origin, isVet: true, funnelId: d.funnelId, stageId: d.stageId, value: l.valor, tags,
    notes: [l.observacoes, nota([["Cidade", l.cidade]])].filter(Boolean).join("\n"),
    followUp: "", converted: false, convertedDate: "", serviceMonths: 0,
    activities: [{ text: `Lead importado (${fonte})`, time: agoraIso }], date: today(),
  };
}

/* ───────────── Google Maps ───────────── */

export type TipoBusca = "clinicas" | "hospitais" | "petshops";

export const TIPOS_BUSCA: { key: TipoBusca; label: string; termo: string; tipoGoogle: "veterinary_care" | "pet_store" }[] = [
  { key: "clinicas", label: "Clínicas veterinárias", termo: "clínica veterinária", tipoGoogle: "veterinary_care" },
  { key: "hospitais", label: "Hospitais veterinários 24h", termo: "hospital veterinário 24 horas", tipoGoogle: "veterinary_care" },
  { key: "petshops", label: "Pet shops", termo: "pet shop", tipoGoogle: "pet_store" },
];

export interface LugarGoogle {
  id: string;
  nome: string;
  endereco: string;
  telefone: string | null; // como o Google devolve
  tel: string | null; // normalizado
  tipoTel: ReturnType<typeof tipoTelefone>;
  site: string | null;
  maps: string | null;
  nota: number | null;
  avaliacoes: number;
  tipos: string[];
  aberto: boolean;
}

/** Converte a resposta da Places API (New). Lugares fechados de vez ficam de fora. */
export function lugaresDoGoogle(json: unknown): LugarGoogle[] {
  const places = (json as { places?: Record<string, unknown>[] })?.places ?? [];
  return places
    .map((p) => {
      const nomeObj = p.displayName as { text?: string } | undefined;
      const telBruto = (p.internationalPhoneNumber as string) || (p.nationalPhoneNumber as string) || null;
      const tel = telBruto ? normalizePhone(telBruto) : null;
      return {
        id: String(p.id ?? ""),
        nome: nomeObj?.text ?? "",
        endereco: String(p.formattedAddress ?? ""),
        telefone: (p.nationalPhoneNumber as string) || telBruto,
        tel,
        tipoTel: tipoTelefone(tel),
        site: (p.websiteUri as string) || null,
        maps: (p.googleMapsUri as string) || null,
        nota: typeof p.rating === "number" ? p.rating : null,
        avaliacoes: Number(p.userRatingCount) || 0,
        tipos: (p.types as string[]) ?? [],
        aberto: p.businessStatus !== "CLOSED_PERMANENTLY",
      };
    })
    .filter((l) => l.id && l.nome && l.aberto);
}

/** Só o que faz sentido para o Thiago: atendimento veterinário ou pet shop. */
export const relevante = (l: Pick<LugarGoogle, "tipos" | "nome">) =>
  l.tipos.includes("veterinary_care") || l.tipos.includes("pet_store") || /veterin|vet\b|pet|animal|c[aã]es|gatos|felin|canin/i.test(l.nome);

/** "Rua X, 123 - Bairro, Aracaju - SE, 49000-000, Brasil" → "Aracaju - SE" */
export function cidadeDoEndereco(endereco: string): string {
  const partes = endereco.split(",").map((p) => p.trim()).filter((p) => p && !/^brasil$/i.test(p) && !/^\d{5}-?\d{3}$/.test(p));
  const c = partes.reverse().find((p) => / - [A-Z]{2}$/.test(p));
  return c ?? "";
}

export function leadDoGoogle(g: LugarGoogle, d: Destino, agoraIso: string): LeadNovo {
  const cidade = cidadeDoEndereco(g.endereco);
  const tags = [...new Set([...(d.prospeccao ? [TAG_PLANILHA] : []), ...d.etiquetas, "google-maps", ...(cidade ? [cidade] : [])].map((t) => t.trim()).filter(Boolean))];
  return {
    name: g.nome, email: "", phone: g.tel ? telefoneParaCrm(g.tel) : g.telefone ?? "", instagram: "", company: g.nome,
    origin: d.origin, isVet: true, funnelId: d.funnelId, stageId: d.stageId, value: 0, tags,
    notes: nota([
      ["Endereço", g.endereco],
      ["Telefone", g.tipoTel === "fixo" ? "fixo (pode não ter WhatsApp)" : null],
      ["Site", g.site],
      ["Avaliação no Google", g.nota != null ? `${g.nota.toFixed(1)} (${g.avaliacoes} avaliações)` : null],
      ["Google Maps", g.maps],
    ]),
    followUp: "", converted: false, convertedDate: "", serviceMonths: 0,
    activities: [{ text: "Lead importado (busca no Google Maps)", time: agoraIso }], date: today(),
  };
}

/** Modelo de planilha (CSV com ";" e acentos, abre direto no Excel). */
export const MODELO_CSV =
  "﻿Nome;WhatsApp;E-mail;Clínica;Instagram;Cidade;Observações\r\n" +
  "Dra. Ana Souza;(79) 99999-0000;ana@clinica.com.br;Clínica Bem-Estar Animal;@clinicabemestar;Aracaju - SE;Indicação do evento\r\n";
