/* Ligação com o Google Agenda.
   Duas peças que falham calado se estiverem erradas: a assinatura do JWT (o Google
   só diria "invalid_grant") e a montagem do evento (o compromisso entraria na hora
   errada). Aqui a assinatura é conferida de verdade, com uma chave gerada na hora. */
import assert from "node:assert";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { corpoEvento, montarJwt } from "../src/server/google-agenda";
import type { Compromisso } from "../src/lib/types";

let passaram = 0;
function teste(nome: string, fn: () => void) {
  try {
    fn();
    passaram++;
    console.log("ok  ", nome);
  } catch (e) {
    console.error("FALHOU", nome);
    console.error(e);
    process.exitCode = 1;
  }
}

function compromisso(p: Partial<Compromisso> = {}): Compromisso {
  return {
    id: "c1",
    titulo: "Diagnóstico financeiro",
    tipo: "diagnostico",
    status: "agendado",
    data: "2026-11-19",
    hora: "14:30",
    duracaoMin: 60,
    leadId: "l1",
    leadNome: "Clínica Pet Vida",
    leadTelefone: "5579999990000",
    responsavelId: null,
    responsavelNome: "Thiago Alemão",
    marcadoPorId: null,
    marcadoPorNome: "Wendell",
    marcadoEm: "2026-11-18T12:00:00.000Z",
    local: "meet.google.com/abc",
    observacoes: "",
    valor: 0,
    googleEventId: null,
    createdAt: "2026-11-18T12:00:00.000Z",
    ...p,
  };
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const chave = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const cfg = { email: "crm@projeto.iam.gserviceaccount.com", chave, calendario: "agenda@group.calendar.google.com" };

const deBase64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/* ── JWT ── */

teste("o JWT tem as três partes e o cabeçalho que o Google exige", () => {
  const partes = montarJwt(cfg).split(".");
  assert.equal(partes.length, 3);
  const h = JSON.parse(deBase64url(partes[0]).toString());
  assert.deepEqual(h, { alg: "RS256", typ: "JWT" });
});

teste("a assinatura confere com a chave da conta de serviço", () => {
  const jwt = montarJwt(cfg);
  const [h, c, a] = jwt.split(".");
  const ok = createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, deBase64url(a));
  assert.equal(ok, true, "o Google recusaria esta assinatura");
});

teste("uma chave trocada derruba a verificação (o teste não passa por acaso)", () => {
  const outra = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwt = montarJwt({ ...cfg, chave: outra.privateKey.export({ type: "pkcs8", format: "pem" }).toString() });
  const [h, c, a] = jwt.split(".");
  assert.equal(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, deBase64url(a)), false);
});

teste("o corpo do JWT leva conta, escopo, destino e validade de 1 hora", () => {
  const corpo = JSON.parse(deBase64url(montarJwt(cfg, 1_700_000_000).split(".")[1]).toString());
  assert.equal(corpo.iss, cfg.email);
  assert.equal(corpo.scope, "https://www.googleapis.com/auth/calendar.events");
  assert.equal(corpo.aud, "https://oauth2.googleapis.com/token");
  assert.equal(corpo.iat, 1_700_000_000);
  assert.equal(corpo.exp - corpo.iat, 3600);
});

teste("base64url não deixa +, / nem = escaparem", () => {
  for (const parte of montarJwt(cfg).split(".")) {
    assert.ok(!/[+/=]/.test(parte), `caractere inválido em: ${parte.slice(0, 20)}…`);
  }
});

/* ── Evento ── */

teste("hora e duração viram início e fim no fuso de São Paulo", () => {
  const e = corpoEvento(compromisso({ hora: "14:30", duracaoMin: 90 }));
  assert.deepEqual(e.start, { dateTime: "2026-11-19T14:30:00", timeZone: "America/Sao_Paulo" });
  assert.deepEqual(e.end, { dateTime: "2026-11-19T16:00:00", timeZone: "America/Sao_Paulo" });
});

teste("compromisso que passa da meia-noite termina no dia seguinte", () => {
  const e = corpoEvento(compromisso({ hora: "23:30", duracaoMin: 60 }));
  assert.deepEqual(e.end, { dateTime: "2026-11-20T00:30:00", timeZone: "America/Sao_Paulo" });
});

teste("sem hora vira evento de dia inteiro, terminando no dia seguinte", () => {
  const e = corpoEvento(compromisso({ hora: "" }));
  assert.deepEqual(e.start, { date: "2026-11-19" });
  assert.deepEqual(e.end, { date: "2026-11-20" });
});

teste("o título junta o compromisso e o lead", () => {
  assert.equal(corpoEvento(compromisso()).summary, "Diagnóstico financeiro — Clínica Pet Vida");
  assert.equal(corpoEvento(compromisso({ leadNome: "" })).summary, "Diagnóstico financeiro");
});

teste("quem marcou vai na descrição do evento", () => {
  const d = corpoEvento(compromisso()).description;
  assert.ok(d.includes("Marcado por: Wendell"), d);
  assert.ok(d.includes("Lead: Clínica Pet Vida"), d);
});

teste("cancelado sai como cancelado e libera o horário", () => {
  const e = corpoEvento(compromisso({ status: "cancelado" }));
  assert.equal(e.status, "cancelled");
  assert.equal(e.transparency, "transparent");
});

teste("agendado é provisório; confirmado e realizado ocupam o horário", () => {
  assert.equal(corpoEvento(compromisso({ status: "agendado" })).status, "tentative");
  assert.equal(corpoEvento(compromisso({ status: "confirmado" })).status, "confirmed");
  assert.equal(corpoEvento(compromisso({ status: "realizado" })).status, "confirmed");
});

teste("aviso de 30 minutos no que ainda vai acontecer, 10 na ligação, nenhum no que já passou", () => {
  assert.deepEqual(corpoEvento(compromisso()).reminders.overrides, [{ method: "popup", minutes: 30 }]);
  assert.deepEqual(corpoEvento(compromisso({ tipo: "ligacao" })).reminders.overrides, [{ method: "popup", minutes: 10 }]);
  assert.deepEqual(corpoEvento(compromisso({ status: "realizado" })).reminders.overrides, []);
});

teste("o evento carrega o id do compromisso, para dar para rastrear depois", () => {
  assert.equal(corpoEvento(compromisso()).extendedProperties.private.crmId, "c1");
});

console.log(`\n${passaram} testes da ligação com o Google passaram`);
