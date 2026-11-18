/* Geração de calendário no formato iCalendar (RFC 5545).
   É o formato que Google Agenda, Calendário do iPhone e Outlook entendem.
   Serve para dois caminhos:
   - um evento avulso baixado e aberto no celular (.ics);
   - o feed assinado /api/agenda/ics, que o celular atualiza sozinho. */

import { TIPOS_COMPROMISSO } from "./constants";
import type { Compromisso } from "./types";

/** Fuso do CRM. O .ics leva a hora local + o nome do fuso, sem conversão. */
export const TZ = "America/Sao_Paulo";

/**
 * Linhas de mais de 75 OCTETOS precisam ser quebradas, com um espaço abrindo a continuação.
 * A conta é em bytes, não em letras: "ã" ocupa 2 e "—" ocupa 3 em UTF-8, então contar
 * caracteres deixaria passar linha fora do limite. O corte também nunca cai no meio de
 * um caractere — cada pedaço é fechado antes de estourar.
 */
function dobrar(linha: string) {
  if (Buffer_byteLength(linha) <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  let limite = 75; // a primeira linha não tem o espaço de continuação
  for (const ch of linha) {
    const b = Buffer_byteLength(ch);
    if (bytes + b > limite) {
      partes.push(atual);
      atual = "";
      bytes = 1; // o espaço que abre a continuação já conta
      limite = 75;
    }
    atual += ch;
    bytes += b;
  }
  if (atual) partes.push(atual);
  return partes.map((p, i) => (i === 0 ? p : " " + p)).join("\r\n");
}

/** Tamanho em bytes UTF-8, sem depender do Buffer do Node (isto roda no navegador também). */
function Buffer_byteLength(s: string) {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

/** Vírgula, ponto e vírgula, barra e quebra de linha têm significado no formato. */
function escapar(v: string) {
  return (v || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const semTraco = (iso: string) => iso.replace(/-/g, "");
const semDoisPontos = (hora: string) => hora.replace(/:/g, "");

/** Carimbo UTC exigido no DTSTAMP. */
function carimbo(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Texto que a pessoa lê dentro do evento no celular. */
function descricao(c: Compromisso, urlCrm?: string) {
  const linhas: string[] = [];
  if (c.leadNome) linhas.push(`Lead: ${c.leadNome}`);
  if (c.leadTelefone) linhas.push(`WhatsApp: ${c.leadTelefone}`);
  if (c.responsavelNome) linhas.push(`Responsável: ${c.responsavelNome}`);
  if (c.marcadoPorNome) linhas.push(`Marcado por: ${c.marcadoPorNome}`);
  if (c.observacoes) linhas.push("", c.observacoes);
  if (urlCrm) linhas.push("", `Abrir no CRM: ${urlCrm}`);
  return linhas.join("\n");
}

function evento(c: Compromisso, opts: { urlCrm?: string; dominio: string }) {
  const L: string[] = ["BEGIN:VEVENT"];
  L.push(`UID:${c.id}@${opts.dominio}`);
  L.push(`DTSTAMP:${carimbo(c.marcadoEm ? new Date(c.marcadoEm) : new Date())}`);
  if (c.hora) {
    const [h, m] = c.hora.split(":").map(Number);
    const fim = new Date(2000, 0, 1, h, m + (c.duracaoMin || 60));
    const horaFim = `${String(fim.getHours()).padStart(2, "0")}${String(fim.getMinutes()).padStart(2, "0")}`;
    // o dia vira quando a duração passa da meia-noite
    const diaFim = fim.getDate() === 1 ? semTraco(c.data) : semTraco(addDia(c.data));
    L.push(`DTSTART;TZID=${TZ}:${semTraco(c.data)}T${semDoisPontos(c.hora)}00`);
    L.push(`DTEND;TZID=${TZ}:${diaFim}T${horaFim}00`);
  } else {
    L.push(`DTSTART;VALUE=DATE:${semTraco(c.data)}`);
    L.push(`DTEND;VALUE=DATE:${semTraco(addDia(c.data))}`);
  }
  const tipo = TIPOS_COMPROMISSO[c.tipo]?.label ?? "Compromisso";
  const titulo = c.titulo || tipo;
  L.push(`SUMMARY:${escapar(c.leadNome ? `${titulo} — ${c.leadNome}` : titulo)}`);
  const desc = descricao(c, opts.urlCrm);
  if (desc) L.push(`DESCRIPTION:${escapar(desc)}`);
  if (c.local) L.push(`LOCATION:${escapar(c.local)}`);
  L.push(`CATEGORIES:${escapar(tipo)}`);
  L.push(`STATUS:${c.status === "cancelado" ? "CANCELLED" : c.status === "confirmado" || c.status === "realizado" ? "CONFIRMED" : "TENTATIVE"}`);
  if (c.status === "cancelado") L.push("TRANSP:TRANSPARENT");
  // aviso 30 minutos antes, só para o que ainda vai acontecer
  if (c.hora && (c.status === "agendado" || c.status === "confirmado")) {
    L.push("BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${escapar(titulo)}`, "END:VALARM");
  }
  L.push("END:VEVENT");
  return L;
}

function addDia(iso: string) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fuso de Brasília declarado no arquivo (sem horário de verão, como está em vigor). */
const BLOCO_FUSO = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZ}`,
  "X-LIC-LOCATION:America/Sao_Paulo",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0300",
  "TZOFFSETTO:-0300",
  "TZNAME:-03",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function gerarIcs(compromissos: Compromisso[], opts: { nome?: string; urlCrm?: string; dominio?: string } = {}) {
  const dominio = opts.dominio || "thiagocrm";
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ThiagoCRM//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(opts.nome || "ThiagoCRM · Agenda")}`,
    `X-WR-TIMEZONE:${TZ}`,
    // o celular busca o feed de novo neste intervalo
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...BLOCO_FUSO,
  ];
  for (const c of compromissos) L.push(...evento(c, { urlCrm: opts.urlCrm, dominio }));
  L.push("END:VCALENDAR");
  return L.map(dobrar).join("\r\n") + "\r\n";
}

/** Link que abre o evento já preenchido no Google Agenda (web ou app). */
export function linkGoogleAgenda(c: Compromisso, urlCrm?: string) {
  const d = semTraco(c.data);
  let datas: string;
  if (c.hora) {
    const [h, m] = c.hora.split(":").map(Number);
    const fim = new Date(2000, 0, 1, h, m + (c.duracaoMin || 60));
    const hf = `${String(fim.getHours()).padStart(2, "0")}${String(fim.getMinutes()).padStart(2, "0")}`;
    datas = `${d}T${semDoisPontos(c.hora)}00/${fim.getDate() === 1 ? d : semTraco(addDia(c.data))}T${hf}00`;
  } else {
    datas = `${d}/${semTraco(addDia(c.data))}`;
  }
  const tipo = TIPOS_COMPROMISSO[c.tipo]?.label ?? "Compromisso";
  const titulo = c.titulo || tipo;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: c.leadNome ? `${titulo} — ${c.leadNome}` : titulo,
    dates: datas,
    ctz: TZ,
    details: descricao(c, urlCrm),
  });
  if (c.local) p.set("location", c.local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Baixa um evento avulso: abrir o arquivo no celular joga direto no calendário. */
export function baixarIcs(c: Compromisso, urlCrm?: string) {
  const texto = gerarIcs([c], { nome: c.titulo, urlCrm });
  const blob = new Blob([texto], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(c.titulo || "compromisso").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${c.data}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
