/* Mês de trabalho do lead.
   O risco real aqui é fuso horário: `new Date("2026-11-01")` é meia-noite em UTC,
   que no Brasil ainda é 31/10 — o lead apareceria no mês errado. Por isso as contas
   são feitas na string, e estes testes guardam esse comportamento. */
import assert from "node:assert";
import { mesCurto, mesDe, mesDistancia, mesLabel, mesNome, mesRelativo, mesSoma, mesValido } from "../src/lib/meses";

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

teste("tira o mês de uma data, com ou sem hora", () => {
  assert.equal(mesDe("2026-11-19"), "2026-11");
  assert.equal(mesDe("2026-11-19T10:00:00.000Z"), "2026-11");
});

teste("o primeiro dia do mês não escorrega para o mês anterior", () => {
  // é o que aconteceria passando por new Date() no fuso de São Paulo
  assert.equal(mesDe("2026-11-01"), "2026-11");
  assert.equal(mesDe("2026-01-01"), "2026-01");
});

teste("andar um mês para trás e para frente", () => {
  assert.equal(mesSoma("2026-11", 1), "2026-12");
  assert.equal(mesSoma("2026-11", -1), "2026-10");
});

teste("a virada do ano funciona nos dois sentidos", () => {
  assert.equal(mesSoma("2026-12", 1), "2027-01");
  assert.equal(mesSoma("2026-01", -1), "2025-12");
  assert.equal(mesSoma("2026-01", -13), "2024-12");
  assert.equal(mesSoma("2026-12", 13), "2028-01");
});

teste("o mês sempre sai com dois dígitos", () => {
  for (let i = -24; i <= 24; i++) {
    const m = mesSoma("2026-06", i);
    assert.ok(mesValido(m), `${m} não é um mês válido (i=${i})`);
  }
});

teste("mês inválido é recusado", () => {
  for (const m of ["2026-13", "2026-00", "2026-1", "26-01", "tudo", ""]) {
    assert.equal(mesValido(m), false, m);
  }
});

teste("ordem alfabética é ordem cronológica — é disso que o filtro depende", () => {
  const meses = ["2026-01", "2025-12", "2026-11", "2026-02"];
  assert.deepEqual([...meses].sort(), ["2025-12", "2026-01", "2026-02", "2026-11"]);
  // "ficou para trás" é só uma comparação de texto
  assert.ok("2026-10" < "2026-11");
  assert.ok("2025-12" < "2026-01");
});

teste("nomes em português", () => {
  assert.equal(mesLabel("2026-11"), "Novembro de 2026");
  assert.equal(mesNome("2026-03"), "Março");
  assert.equal(mesCurto("2026-11"), "Nov/26");
  assert.equal(mesCurto("2027-01"), "Jan/27");
});

teste("distância entre meses tem sinal", () => {
  assert.equal(mesDistancia("2026-11", "2026-11"), 0);
  assert.equal(mesDistancia("2026-11", "2026-12"), 1);
  assert.equal(mesDistancia("2026-11", "2026-09"), -2);
  assert.equal(mesDistancia("2026-11", "2027-11"), 12);
});

teste("como o mês é escrito em relação a hoje", () => {
  const hoje = "2026-11";
  assert.equal(mesRelativo("2026-11", hoje), "este mês");
  assert.equal(mesRelativo("2026-10", hoje), "mês passado");
  assert.equal(mesRelativo("2026-12", hoje), "mês que vem");
  assert.equal(mesRelativo("2026-08", hoje), "Agosto de 2026");
});

/* ── Regra do "trazer pendentes" ── */

interface L { mesRef: string; converted: boolean; funnelId: string }
const pendentes = (ls: L[], mes: string, funil?: string) =>
  ls.filter((l) => !l.converted && l.mesRef && l.mesRef < mes && (!funil || l.funnelId === funil));

teste("trazer pendentes pega os meses anteriores, nunca o mês atual nem o futuro", () => {
  const ls: L[] = [
    { mesRef: "2026-09", converted: false, funnelId: "a" },
    { mesRef: "2026-10", converted: false, funnelId: "a" },
    { mesRef: "2026-11", converted: false, funnelId: "a" },
    { mesRef: "2026-12", converted: false, funnelId: "a" },
  ];
  assert.deepEqual(pendentes(ls, "2026-11").map((l) => l.mesRef), ["2026-09", "2026-10"]);
});

teste("lead já convertido fica onde está", () => {
  const ls: L[] = [
    { mesRef: "2026-09", converted: true, funnelId: "a" },
    { mesRef: "2026-09", converted: false, funnelId: "a" },
  ];
  assert.equal(pendentes(ls, "2026-11").length, 1);
});

teste("trazer pendentes só mexe no funil que está aberto", () => {
  const ls: L[] = [
    { mesRef: "2026-09", converted: false, funnelId: "a" },
    { mesRef: "2026-09", converted: false, funnelId: "b" },
  ];
  assert.equal(pendentes(ls, "2026-11", "a").length, 1);
  assert.equal(pendentes(ls, "2026-11").length, 2);
});

teste("depois de trazer, não sobra pendente nenhum", () => {
  let ls: L[] = [
    { mesRef: "2026-08", converted: false, funnelId: "a" },
    { mesRef: "2026-10", converted: false, funnelId: "a" },
  ];
  const alvo = "2026-11";
  const mover = new Set(pendentes(ls, alvo).map((_, i) => i));
  ls = ls.map((l, i) => (mover.has(i) ? { ...l, mesRef: alvo } : l));
  assert.equal(pendentes(ls, alvo).length, 0);
  assert.ok(ls.every((l) => l.mesRef === alvo));
});

console.log(`\n${passaram} testes do mês passaram`);
