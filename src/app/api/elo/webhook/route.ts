import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crmAdmin } from "@/server/admin";
import { assinaturaValida, eloSecret } from "@/server/elo-assinatura";
import { ELO_CONFIGURED, eloApi } from "@/server/elo";
import { mapFunnel } from "@/lib/mappers";
import { aplicarEsteira, type EventoEsteira } from "@/lib/esteira";
import { digits, normalizePhone, telefoneParaCrm, variantesTelefone } from "@/lib/utils";

export const maxDuration = 30;

type Row = Record<string, unknown>;

/**
 * Webhook de saída do Elo (Integrador → Webhooks), evento `esteira.atualizada`.
 * Confere a assinatura `X-Elo-Signature: sha256=<hmac>` com ELO_WEBHOOK_SECRET.
 *
 * Lead não encontrado no CRM + contato marcado no Elo com um funil do CRM
 * (campos crm_funil_id / crm_etapa_id) → o lead é criado nesse funil.
 */
export async function POST(req: Request) {
  const secret = eloSecret();
  if (!secret) return Response.json({ erro: "ELO_WEBHOOK_SECRET não configurado no CRM" }, { status: 503 });

  const raw = await req.text();
  if (!assinaturaValida(secret, raw, req.headers.get("x-elo-signature"))) return Response.json({ erro: "Assinatura inválida" }, { status: 401 });

  let body: { evento?: string; dados?: EventoEsteira };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ erro: "JSON inválido" }, { status: 400 });
  }
  // outros eventos (ou o botão "Testar" do Elo) são aceitos e ignorados
  if (body.evento !== "esteira.atualizada" || !body.dados?.esteira) return Response.json({ ok: true, ignorado: body.evento ?? "sem evento" });

  const sb = crmAdmin();
  if (!sb) return Response.json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurado no CRM" }, { status: 503 });
  const ev = body.dados;

  let lead: Row | null = await acharLead(sb, ev);
  let criado = false;
  if (!lead) {
    const novo = await criarLead(sb, ev);
    if (!("lead" in novo)) return Response.json(novo.erro ? { erro: novo.erro } : { ok: true, ignorado: novo.ignorado }, { status: novo.erro ? 500 : 200 });
    lead = novo.lead;
    criado = true;
    // devolve o id do lead ao Elo: os próximos avisos acham o lead direto, sem depender do telefone
    if (ELO_CONFIGURED) {
      const id = String(novo.lead.id);
      after(() => eloApi("contatos", { method: "POST", body: { telefone: ev.contato.telefone, campos: { crm_id: id } } }).then(() => undefined));
    }
  }

  const atual: Row = lead;
  const { data: fRows } = await sb.from("funnels").select("*").eq("id", atual.funnel_id as string);
  const funnels = (fRows ?? []).map(mapFunnel);
  const r = aplicarEsteira(
    {
      funnelId: (atual.funnel_id as string) ?? null,
      stageId: (atual.stage_id as string) ?? null,
      converted: !!atual.converted,
      followUp: (atual.follow_up as string) ?? "",
      eloContatos: Number(atual.elo_contatos) || 0,
      eloRespostas: Number(atual.elo_respostas) || 0,
      eloStatus: (atual.elo_status as string) ?? null,
      eloCadencia: (atual.elo_cadencia as string) ?? null,
    },
    funnels,
    ev,
  );
  const activities = [...((atual.activities as unknown[]) ?? []), ...r.atividades];
  const { error } = await sb.from("leads").update({ ...r.patch, ...(r.atividades.length ? { activities } : {}) }).eq("id", atual.id as string);
  if (error) {
    const falta = /elo_/i.test(error.message);
    return Response.json({ erro: falta ? "Rode o supabase/esteira-elo.sql no banco do CRM" : error.message }, { status: 500 });
  }
  return Response.json({ ok: true, lead_id: atual.id, criado, etapa: r.moverPara?.name ?? null, atividades: r.atividades.length });
}

/** 1º pelo crm_id (lead enviado pelo CRM); 2º pelo telefone, com ou sem o nono dígito. */
async function acharLead(sb: SupabaseClient, ev: EventoEsteira): Promise<Row | null> {
  const crmId = ev.contato.crm_id ?? ev.contato.campos?.crm_id ?? null;
  if (crmId && /^[0-9a-f-]{36}$/i.test(crmId)) {
    const { data } = await sb.from("leads").select("*").eq("id", crmId).maybeSingle();
    if (data) return data;
  }
  const tel = normalizePhone(ev.contato.telefone ?? "");
  const fim = digits(ev.contato.telefone ?? "").slice(-4); // o nono dígito nunca está nos 4 últimos
  if (!tel || fim.length !== 4) return null;
  const formas = variantesTelefone(tel);
  const { data } = await sb.from("leads").select("*").ilike("phone", `%${fim}`).limit(50);
  const candidatos = (data ?? []).filter((l) => formas.includes(normalizePhone(String(l.phone ?? "")) ?? ""));
  // prefere a forma exata e, entre iguais, o lead mais antigo
  return candidatos.find((l) => normalizePhone(String(l.phone)) === tel) ?? candidatos[0] ?? null;
}

const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

async function criarLead(sb: SupabaseClient, ev: EventoEsteira): Promise<{ lead: Row } | { erro?: string; ignorado?: string }> {
  const campos = ev.contato.campos ?? {};
  const funilId = campos.crm_funil_id;
  if (!funilId) return { ignorado: "lead não encontrado no CRM (contato sem funil do CRM marcado no Elo)" };
  const tel = normalizePhone(ev.contato.telefone ?? "");
  if (!tel) return { ignorado: "telefone inválido" };

  const { data: fRow } = await sb.from("funnels").select("*").eq("id", funilId).maybeSingle();
  if (!fRow) return { ignorado: `o funil marcado no Elo não existe mais no CRM (${campos.funil ?? funilId})` };
  const funil = mapFunnel(fRow);
  const etapa = funil.stages.find((s) => s.id === campos.crm_etapa_id) ?? funil.stages[0];

  const quem = ev.toque?.direcao === "in" ? "a pessoa chamou no WhatsApp" : ev.toque ? "primeiro contato pelo Elo" : "funil marcado no Elo";
  const agora = new Date().toISOString();
  const nome = (ev.contato.nome ?? "").trim();
  const { data, error } = await sb
    .from("leads")
    .insert({
      name: nome && !nome.startsWith("+") ? nome : telefoneParaCrm(tel),
      phone: telefoneParaCrm(tel),
      email: campos.email || null,
      company: campos.empresa || null,
      instagram: campos.instagram || null,
      origin: "whatsapp",
      funnel_id: funil.id,
      stage_id: etapa?.id ?? null,
      date: hojeBrasilia(),
      activities: [{ text: `Lead criado pelo Elo (${quem}) em ${funil.name}${etapa ? ` · ${etapa.name}` : ""}`, time: agora }],
    })
    .select("*")
    .single();
  if (error || !data) return { erro: error?.message ?? "Não foi possível criar o lead" };
  return { lead: data };
}
