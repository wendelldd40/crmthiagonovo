import {
  lerCSV, mapearCabecalhos, montarLinhas, indiceExistentes, leadDaLinha, lugaresDoGoogle, relevante, cidadeDoEndereco, leadDoGoogle, celulaTexto,
} from "../src/lib/importacao.ts";

let fail = 0;
const eq = (n: string, g: unknown, e: unknown) => { const ok = JSON.stringify(g) === JSON.stringify(e); if (!ok) fail++; console.log(ok ? "ok  " : "FAIL", n, ok ? "" : `→ ${JSON.stringify(g)} (esperado ${JSON.stringify(e)})`); };

// CSV do Excel BR (;), com aspas, quebra de linha dentro de campo e BOM
const csv = '﻿Nome;WhatsApp;E-mail;Clínica;Insta;Cidade;Obs\r\n' +
  'Ana;(79) 99999-0000;ANA@X.COM;Clínica A;https://instagram.com/clinica.a/;Aracaju - SE;"linha 1\nlinha 2"\r\n' +
  'Bruno;71 9188-4805;;;;;\r\n' +
  ';;;;;;\r\n' +
  'Carla;79999;;Pet C;;;\r\n' +
  'Ana 2;79999990000;;;;;\r\n' +
  ';;;Hospital D;@hospd;;\r\n' +
  'Eva;;;;;;\r\n' +
  '"Fábio ""Fafá""";(11) 3333-4444;;;;;\r\n';
const dados = lerCSV(csv);
eq("CSV: linhas (a vazia fica para a numeração bater)", dados.length, 9);
eq("CSV: aspas duplas", dados[8][0], 'Fábio "Fafá"');
eq("CSV: quebra de linha dentro do campo", dados[1][6], "linha 1\nlinha 2");
eq("CSV com vírgula (Google Planilhas)", lerCSV("nome,telefone\nX,\"7999, 1\"")[1], ["X", "7999, 1"]);

const map = mapearCabecalhos(dados[0]);
eq("cabeçalhos reconhecidos", map, { nome: 0, telefone: 1, email: 2, empresa: 3, instagram: 4, cidade: 5, observacoes: 6 });
eq("cabeçalho 'Celular' e 'Nome Fantasia'", mapearCabecalhos(["Nome Fantasia", "Celular", "Responsável"]), { nome: 2, telefone: 1, empresa: 0 });

const existentes = indiceExistentes([{ id: "1", name: "Lead antigo", phone: "(71) 99188-4805", email: "" }]);
const linhas = montarLinhas(dados, map, existentes);
eq("status por linha", linhas.map((l) => [l.linha, l.status]), [[2, "ok"], [3, "ja_no_crm"], [5, "telefone_invalido"], [6, "duplicado_arquivo"], [7, "ok"], [8, "sem_contato"], [9, "ok"]]);
eq("já no CRM mesmo sem o 9", linhas[1].existente, "Lead antigo");
eq("sem nome usa a clínica", linhas[4].nome, "Hospital D");
eq("instagram vira @usuario", linhas[0].instagram, "@clinica.a");
eq("e-mail minúsculo", linhas[0].email, "ana@x.com");
eq("fixo identificado", linhas[6].tipoTel, "fixo");
eq("celular identificado", linhas[0].tipoTel, "celular");

const d = { funnelId: "f1", stageId: "s1", origin: "lista", prospeccao: true, etiquetas: ["Evento SE"] };
const lead = leadDaLinha(linhas[0], d, "2026-10-19T12:00:00Z");
eq("lead: telefone formatado", lead.phone, "(79) 99999-0000");
eq("lead: etiquetas (prospecção + extra + cidade)", lead.tags, ["planilha", "Evento SE", "Aracaju - SE"]);
eq("lead: funil/etapa/origem", [lead.funnelId, lead.stageId, lead.origin], ["f1", "s1", "lista"]);
eq("célula numérica longa não vira notação científica", celulaTexto(5579999990000), "5579999990000");

// Google Places (New)
const g = lugaresDoGoogle({ places: [
  { id: "p1", displayName: { text: "Clínica Vet Sol" }, formattedAddress: "Av. X, 100 - Jardins, Aracaju - SE, 49025-000, Brasil", nationalPhoneNumber: "(79) 99876-5432", internationalPhoneNumber: "+55 79 99876-5432", websiteUri: "https://sol.vet", googleMapsUri: "https://maps.google.com/?cid=1", rating: 4.8, userRatingCount: 210, types: ["veterinary_care", "point_of_interest"], businessStatus: "OPERATIONAL" },
  { id: "p2", displayName: { text: "Pet Fechado" }, formattedAddress: "Rua Y, Aracaju - SE", types: ["pet_store"], businessStatus: "CLOSED_PERMANENTLY" },
  { id: "p3", displayName: { text: "Hospital 24h Patas" }, formattedAddress: "Rua Z, 5 - Centro, Lagarto - SE, 49400-000, Brasil", nationalPhoneNumber: "(79) 3631-0000", types: ["veterinary_care"] },
  { id: "p4", displayName: { text: "Padaria Pão Bom" }, formattedAddress: "Rua W", types: ["bakery"] },
] });
eq("Google: fechados saem", g.map((x) => x.id), ["p1", "p3", "p4"]);
eq("Google: relevância (padaria sai)", g.filter(relevante).map((x) => x.id), ["p1", "p3"]);
eq("Google: celular x fixo", g.map((x) => x.tipoTel), ["celular", "fixo", null]);
eq("cidade do endereço", cidadeDoEndereco(g[0].endereco), "Aracaju - SE");
const lg = leadDoGoogle(g[1], { ...d, origin: "google_maps", etiquetas: [] }, "2026-10-19T12:00:00Z");
eq("lead do Google: tags", lg.tags, ["planilha", "google-maps", "Lagarto - SE"]);
eq("lead do Google: aviso de fixo nas notas", lg.notes.includes("fixo (pode não ter WhatsApp)"), true);
eq("lead do Google: telefone", lg.phone, "(79) 3631-0000");

console.log(fail ? `\n${fail} FALHA(S)` : "\nTodos os testes passaram");
process.exit(fail);
