import { aplicarEsteira, numeroDaEtapa, etapaParaContatos } from "../src/lib/esteira.ts";
let fail = 0;
const eq = (n: string, g: unknown, e: unknown) => { const ok = JSON.stringify(g) === JSON.stringify(e); if (!ok) fail++; console.log(ok ? "ok  " : "FAIL", n, ok ? "" : `→ ${JSON.stringify(g)} (esperado ${JSON.stringify(e)})`); };

for (const [nome, exp] of [["1º contato", 1], ["2° Contato", 2], ["Contato 3", 3], ["4ª tentativa", 4], ["Segundo contato", 2], ["Décimo segundo contato", 12], ["Follow-up 5", 5], ["Em contato", null], ["Primeiro contato", 1], ["Proposta", null], ["12o contato", 12]] as [string, number | null][])
  eq(`etapa "${nome}"`, numeroDaEtapa(nome), exp);

const st = (id: string, name: string) => ({ id, name, color: "#000" });
const f = { id: "f", name: "SDR", icon: "", color: "", stages: [st("s0", "Lead novo"), st("s1", "1º contato"), st("s2", "2º contato"), st("s3", "3º contato"), st("s5", "5º contato"), st("p", "Proposta"), st("x", "Fechado")] };
eq("4 contatos → etapa 3º (maior ≤ 4)", etapaParaContatos(f, 4)?.id, "s3");

const base = { funnelId: "f", stageId: "s1", converted: false, followUp: "", eloContatos: 1, eloRespostas: 0, eloStatus: "ativa", eloCadencia: "Frio 12" };
const ev = (contatos: number, extra: any = {}) => ({
  contato: { id: "c", nome: "Ana", telefone: "5579", crm_id: "x" },
  esteira: { cadencia: { id: "k", nome: "Frio 12", intervalo_dias: 1, total_contatos: 12 }, contatos, total: 12, ultimo_contato: "2026-10-29", ultimo_tipo: "texto", proximo_contato: "2026-10-30", respostas: 0, ultima_resposta: null, status: "ativa", ...extra },
  toque: { tipo: "texto", direcao: "out", origem: "celular", dia: "2026-10-29", nota: null },
});
let r = aplicarEsteira(base, [f], ev(2) as any, "2026-10-29T12:00:00Z");
eq("2º contato move para '2º contato'", r.moverPara?.id, "s2");
eq("follow-up vira o próximo do Elo", r.patch.follow_up, "2026-10-30");
eq("histórico do 2º contato", r.atividades[0].text, "2º contato pelo WhatsApp (mensagem) · Frio 12 2/12");

r = aplicarEsteira({ ...base, stageId: "p" }, [f], ev(3) as any);
eq("lead em Proposta não volta", r.moverPara, null);
r = aplicarEsteira({ ...base, converted: true }, [f], ev(3) as any);
eq("cliente convertido não se move", r.moverPara, null);

r = aplicarEsteira({ ...base, eloContatos: 2, stageId: "s2" }, [f], { ...ev(2), toque: { tipo: "ligacao", direcao: "out", nota: "atendeu" } } as any);
eq("ligação no mesmo dia não cria novo contato", r.atividades.map((a) => a.text), ["Ligação registrada no mesmo dia de outro contato: atendeu"]);

r = aplicarEsteira({ ...base, eloContatos: 2, stageId: "s2" }, [f], { ...ev(2, { respostas: 1, ultima_resposta: "2026-10-29" }), toque: { tipo: "texto", direcao: "in" } } as any);
eq("resposta registrada no histórico", r.atividades[0].text, "Respondeu no WhatsApp: 1 dia com resposta");

r = aplicarEsteira({ ...base, eloContatos: 11, stageId: "s5" }, [f], ev(12, { status: "concluida", proximo_contato: null }) as any);
eq("concluída limpa o follow-up", r.patch.follow_up, null);
eq("concluída registra no histórico", r.atividades.some((a) => a.text.startsWith("Cadência concluída")), true);

const semEtapas = { ...f, stages: [st("a", "Novo"), st("b", "Em contato"), st("c", "Fechado")] };
r = aplicarEsteira({ ...base, funnelId: "f", stageId: "a" }, [semEtapas], ev(3) as any);
eq("funil sem etapas numeradas: só contador", [r.moverPara, r.patch.elo_contatos], [null, 3]);
console.log(fail ? `\n${fail} FALHA(S)` : "\nTodos os testes passaram");
process.exit(fail);
