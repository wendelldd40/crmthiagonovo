/* Calendário (.ics): o que sai daqui é lido pelo Google Agenda e pelo Calendário do iPhone.
   O teste desmonta o arquivo gerado e confere que o texto volta exatamente como entrou. */
import assert from "node:assert";
import { gerarIcs, linkGoogleAgenda } from "../src/lib/ics";
import type { Compromisso } from "../src/lib/types";

const BARRA = String.fromCharCode(92);

function compromisso(p: Partial<Compromisso> = {}): Compromisso {
  return {
    id: "c1",
    titulo: "Diagnóstico financeiro",
    tipo: "diagnostico",
    status: "confirmado",
    data: "2026-11-20",
    hora: "14:30",
    duracaoMin: 60,
    leadId: "l1",
    leadNome: "Camila Rocha",
    leadTelefone: "79991234567",
    responsavelId: null,
    responsavelNome: "Thiago Alemão",
    marcadoPorId: "u1",
    marcadoPorNome: "Wendell",
    marcadoEm: "2026-11-10T12:00:00.000Z",
    local: "https://meet.google.com/abc-defg-hij",
    observacoes: "",
    valor: 197,
    createdAt: "2026-11-10T12:00:00.000Z",
    ...p,
  };
}

/** Desfaz os escapes do formato: \n vira quebra de linha, \; \, \\ viram o próprio caractere. */
function desescapar(v: string) {
  let out = "";
  for (let i = 0; i < v.length; i++) {
    if (v[i] !== BARRA || i === v.length - 1) {
      out += v[i];
      continue;
    }
    const prox = v[++i];
    out += prox === "n" || prox === "N" ? "\n" : prox;
  }
  return out;
}

/**
 * Junta as continuações e desfaz os escapes — o inverso do que o gerador faz.
 * O bloco do fuso é pulado: ele tem DTSTART próprio (1970) que não é de nenhum compromisso.
 */
function campos(ics: string) {
  const inteiro = ics.replace(/\r\n[ \t]/g, "");
  const out = new Map<string, string[]>();
  let dentroDoFuso = false;
  for (const linha of inteiro.split("\r\n")) {
    if (linha === "BEGIN:VTIMEZONE") dentroDoFuso = true;
    else if (linha === "END:VTIMEZONE") dentroDoFuso = false;
    if (dentroDoFuso) continue;
    const i = linha.indexOf(":");
    if (i < 0) continue;
    const nome = linha.slice(0, i).split(";")[0];
    const valor = desescapar(linha.slice(i + 1));
    out.set(nome, [...(out.get(nome) ?? []), valor]);
  }
  return out;
}

const bytes = (s: string) => new TextEncoder().encode(s).length;
let passaram = 0;
function teste(nome: string, fn: () => void) {
  fn();
  passaram++;
  console.log("ok  ", nome);
}

teste("estrutura do arquivo", () => {
  const ics = gerarIcs([compromisso()]);
  const linhas = ics.split("\r\n");
  assert.equal(linhas[0], "BEGIN:VCALENDAR");
  assert.ok(linhas.includes("END:VCALENDAR"));
  assert.ok(ics.endsWith("\r\n"), "precisa terminar com CRLF");
  assert.equal(linhas.filter((l) => l === "BEGIN:VEVENT").length, 1);
  assert.ok(ics.includes("TZID:America/Sao_Paulo"), "o fuso precisa estar declarado");
});

teste("hora e duração viram início e fim", () => {
  const c = campos(gerarIcs([compromisso({ hora: "14:30", duracaoMin: 60 })]));
  assert.equal(c.get("DTSTART")![0], "20261120T143000");
  assert.equal(c.get("DTEND")![0], "20261120T153000");
});

teste("compromisso que passa da meia-noite termina no dia seguinte", () => {
  const c = campos(gerarIcs([compromisso({ data: "2026-11-25", hora: "23:30", duracaoMin: 90 })]));
  assert.equal(c.get("DTSTART")![0], "20261125T233000");
  assert.equal(c.get("DTEND")![0], "20261126T010000");
});

teste("sem hora vira evento de dia inteiro", () => {
  const ics = gerarIcs([compromisso({ hora: "", data: "2026-12-01" })]);
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261201"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261202"), "dia inteiro fecha no dia seguinte");
});

teste("vírgula, ponto e vírgula e barra voltam inteiros", () => {
  const titulo = `Reunião: metas, equipe; e caixa ${BARRA} revisão`;
  const c = campos(gerarIcs([compromisso({ titulo, leadNome: "" })]));
  assert.equal(c.get("SUMMARY")![0], titulo);
});

teste("quebra de linha da observação sobrevive", () => {
  const obs = "Primeira linha\nSegunda linha, com vírgula";
  const desc = campos(gerarIcs([compromisso({ observacoes: obs })])).get("DESCRIPTION")![0];
  assert.ok(desc.includes(obs), "a observação precisa voltar igual");
  assert.ok(desc.includes("Marcado por: Wendell"), "quem marcou vai junto para o celular");
  assert.ok(desc.includes("Lead: Camila Rocha"));
});

teste("nenhuma linha passa de 75 octetos, nem com acento", () => {
  const titulo = "Reunião de alinhamento estratégico sobre precificação, margem e expansão da operação veterinária em três unidades";
  const ics = gerarIcs([compromisso({ titulo, observacoes: "ação ç ã é í ó ú — ".repeat(20) })]);
  for (const linha of ics.split("\r\n")) {
    assert.ok(bytes(linha) <= 75, `linha com ${bytes(linha)} bytes: ${linha}`);
  }
  // e o texto continua inteiro depois de juntar as continuações
  assert.equal(campos(ics).get("SUMMARY")![0], `${titulo} — Camila Rocha`);
});

teste("acento não é cortado ao meio na dobra", () => {
  const ics = gerarIcs([compromisso({ titulo: "ã".repeat(120), leadNome: "" })]);
  assert.ok(!ics.includes("�"), "não pode haver caractere quebrado");
  assert.equal(campos(ics).get("SUMMARY")![0], "ã".repeat(120));
});

teste("cancelado sai como CANCELLED e não bloqueia o horário", () => {
  const ics = gerarIcs([compromisso({ status: "cancelado" })]);
  assert.ok(ics.includes("STATUS:CANCELLED"));
  assert.ok(ics.includes("TRANSP:TRANSPARENT"));
  assert.ok(!ics.includes("BEGIN:VALARM"), "cancelado não avisa");
});

teste("aviso 30 minutos antes só no que ainda vai acontecer", () => {
  assert.ok(gerarIcs([compromisso({ status: "agendado" })]).includes("TRIGGER:-PT30M"));
  assert.ok(!gerarIcs([compromisso({ status: "realizado" })]).includes("BEGIN:VALARM"));
});

teste("cada compromisso tem identificador próprio", () => {
  const ics = gerarIcs([compromisso({ id: "a" }), compromisso({ id: "b" })], { dominio: "crm.exemplo" });
  assert.ok(ics.includes("UID:a@crm.exemplo"));
  assert.ok(ics.includes("UID:b@crm.exemplo"));
});

teste("link do Google Agenda leva data, fuso e detalhes", () => {
  const url = new URL(linkGoogleAgenda(compromisso(), "https://crm.exemplo/agenda"));
  assert.equal(url.searchParams.get("dates"), "20261120T143000/20261120T153000");
  assert.equal(url.searchParams.get("ctz"), "America/Sao_Paulo");
  assert.equal(url.searchParams.get("text"), "Diagnóstico financeiro — Camila Rocha");
  assert.ok(url.searchParams.get("details")!.includes("Marcado por: Wendell"));
  assert.equal(url.searchParams.get("location"), "https://meet.google.com/abc-defg-hij");
});

teste("link do Google para dia inteiro usa só as datas", () => {
  const url = new URL(linkGoogleAgenda(compromisso({ hora: "", data: "2026-12-01" })));
  assert.equal(url.searchParams.get("dates"), "20261201/20261202");
});

console.log(`\n${passaram} testes do calendário passaram`);
