/* Esteira do Elo → lead do CRM. Função pura: recebe o evento e devolve o que mudar no lead. */
import type { Activity, Funnel, Stage } from "./types";
import { normalize } from "./utils";

/** Corpo do evento `esteira.atualizada` que o Elo envia (ver Elo: core/esteira.ts). */
export interface EventoEsteira {
  contato: { id: string; nome: string; telefone: string; crm_id: string | null; campos?: Record<string, string> };
  esteira: {
    cadencia: { id: string; nome: string; intervalo_dias: number; total_contatos: number } | null;
    contatos: number;
    total: number | null;
    ultimo_contato: string | null;
    ultimo_tipo: string | null;
    proximo_contato: string | null;
    respostas: number;
    ultima_resposta: string | null;
    status: "sem" | "ativa" | "pausada" | "concluida";
  };
  mudancas?: { novo_contato: boolean; nova_resposta: boolean; contatos_antes: number; respostas_antes: number };
  toque?: { tipo?: string; direcao?: "out" | "in"; origem?: string; dia?: string; nota?: string | null } | null;
}

export interface LeadAtual {
  funnelId: string | null;
  stageId: string | null;
  converted: boolean;
  followUp: string;
  eloContatos: number;
  eloRespostas: number;
  eloStatus: string | null;
  eloCadencia: string | null;
}

const TIPO: Record<string, string> = {
  texto: "mensagem", modelo: "modelo", audio: "áudio", imagem: "imagem", video: "vídeo", documento: "documento",
  figurinha: "figurinha", localizacao: "localização", ligacao: "ligação", outro: "outro",
};
export const tipoLabel = (tipos: string | null | undefined) => (tipos ? tipos.split(",").map((t) => TIPO[t] ?? t).join(" + ") : "");

const ORDINAIS: [string, number][] = [
  ["decimo segundo", 12], ["decimo primeiro", 11], ["decimo", 10], ["primeiro", 1], ["segundo", 2], ["terceiro", 3],
  ["quarto", 4], ["quinto", 5], ["sexto", 6], ["setimo", 7], ["oitavo", 8], ["nono", 9],
];

/**
 * Número de contato que uma etapa representa, pelo nome.
 * "1º contato", "2° Contato", "Contato 3", "4ª tentativa", "Segundo contato", "Follow-up 5" → número. "Em contato" → null.
 */
export function numeroDaEtapa(nome: string): number | null {
  const n = normalize(nome).replace(/[º°ª]/g, "o ").replace(/\s+/g, " ").trim();
  if (!/(contato|toque|tentativa|follow)/.test(n)) return null;
  const a = n.match(/(\d{1,2})\s*o?\s*(contato|toque|tentativa|follow)/);
  if (a) return Number(a[1]);
  const b = n.match(/(contato|toque|tentativa|follow[- ]?up)\s*(\d{1,2})/);
  if (b) return Number(b[2]);
  for (const [w, v] of ORDINAIS) if (new RegExp(`\\b${w}\\b`).test(n)) return v;
  return null;
}

/** Etapa do funil que corresponde a N contatos: a de maior número ≤ N. */
export function etapaParaContatos(f: Funnel | undefined, contatos: number): Stage | null {
  if (!f || contatos < 1) return null;
  let melhor: { s: Stage; n: number } | null = null;
  for (const s of f.stages) {
    const n = numeroDaEtapa(s.name);
    if (n != null && n <= contatos && (!melhor || n > melhor.n)) melhor = { s, n };
  }
  return melhor?.s ?? null;
}

export interface Aplicacao {
  /** colunas do banco (tabela leads) a atualizar */
  patch: Record<string, unknown>;
  atividades: Activity[];
  moverPara: Stage | null;
}

const ord = (n: number) => `${n}º`;

export function aplicarEsteira(lead: LeadAtual, funnels: Funnel[], ev: EventoEsteira, agoraIso = new Date().toISOString()): Aplicacao {
  const e = ev.esteira;
  const atividades: Activity[] = [];
  const patch: Record<string, unknown> = {
    elo_contatos: e.contatos,
    elo_total: e.total,
    elo_cadencia: e.cadencia?.nome ?? null,
    elo_ultimo_contato: e.ultimo_contato,
    elo_ultimo_tipo: e.ultimo_tipo,
    elo_respostas: e.respostas,
    elo_ultima_resposta: e.ultima_resposta,
    elo_status: e.status,
    elo_atualizado_em: agoraIso,
  };

  // próximo contato do CRM acompanha a cadência (o "Para contatar agora" do Painel usa este campo)
  if (e.status === "ativa" && e.proximo_contato) patch.follow_up = e.proximo_contato;
  else if ((e.status === "concluida" || e.status === "pausada") && lead.eloStatus === "ativa") patch.follow_up = null;

  const cad = e.cadencia ? ` · ${e.cadencia.nome} ${e.contatos}/${e.total ?? "?"}` : "";
  const t = ev.toque;
  if (e.contatos > lead.eloContatos) {
    const detalhe = t?.direcao === "out" && t.tipo ? ` (${tipoLabel(t.tipo)}${t.nota ? `: ${t.nota}` : ""})` : e.ultimo_tipo ? ` (${tipoLabel(e.ultimo_tipo)})` : "";
    atividades.push({ text: `${ord(e.contatos)} contato pelo WhatsApp${detalhe}${cad}`, time: agoraIso });
  } else if (t?.tipo === "ligacao" && t.direcao === "out") {
    atividades.push({ text: `Ligação registrada no mesmo dia de outro contato${t.nota ? `: ${t.nota}` : ""}`, time: agoraIso });
  }
  if (e.respostas > lead.eloRespostas) {
    const lig = t?.direcao === "in" && t.tipo === "ligacao" ? ` (${t.nota ?? "ligou"})` : "";
    atividades.push({ text: `Respondeu no WhatsApp${lig}: ${e.respostas} ${e.respostas === 1 ? "dia" : "dias"} com resposta`, time: agoraIso });
  }
  if (e.status === "concluida" && lead.eloStatus !== "concluida") {
    atividades.push({ text: `Cadência concluída no Elo${cad}`, time: agoraIso });
  }
  if (e.cadencia && e.cadencia.nome !== lead.eloCadencia && e.contatos === lead.eloContatos) {
    atividades.push({ text: `Entrou na cadência ${e.cadencia.nome} no Elo (${e.cadencia.total_contatos} contatos, ${e.cadencia.intervalo_dias === 1 ? "todo dia" : `a cada ${e.cadencia.intervalo_dias} dias`})`, time: agoraIso });
  }

  // anda a etapa só para frente, e só entre etapas "Nº contato"
  let moverPara: Stage | null = null;
  if (!lead.converted && e.contatos > 0) {
    const f = funnels.find((x) => x.id === lead.funnelId);
    const alvo = etapaParaContatos(f, e.contatos);
    if (f && alvo && alvo.id !== lead.stageId) {
      const iAlvo = f.stages.findIndex((s) => s.id === alvo.id);
      const iAtual = f.stages.findIndex((s) => s.id === lead.stageId);
      if (iAlvo > iAtual) {
        moverPara = alvo;
        patch.stage_id = alvo.id;
        atividades.push({ text: `Movido para "${alvo.name}" pela esteira do Elo`, time: agoraIso });
      }
    }
  }
  return { patch, atividades, moverPara };
}
