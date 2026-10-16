import { createHmac, timingSafeEqual } from "node:crypto";
import { crmAdmin } from "@/server/admin";
import { mapFunnel } from "@/lib/mappers";
import { aplicarEsteira, type EventoEsteira } from "@/lib/esteira";
import { digits, normalizePhone } from "@/lib/utils";

export const maxDuration = 30;

/**
 * Webhook de saída do Elo (Integrador → Webhooks), evento `esteira.atualizada`.
 * Confere a assinatura `X-Elo-Signature: sha256=<hmac>` com ELO_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = (process.env.ELO_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return Response.json({ erro: "ELO_WEBHOOK_SECRET não configurado no CRM" }, { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-elo-signature") ?? "";
  const esperado = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ erro: "Assinatura inválida" }, { status: 401 });

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

  // 1º pelo crm_id (lead enviado pelo CRM); 2º pelo telefone
  let lead: Record<string, unknown> | null = null;
  const crmId = ev.contato.crm_id ?? ev.contato.campos?.crm_id ?? null;
  if (crmId && /^[0-9a-f-]{36}$/i.test(crmId)) {
    const { data } = await sb.from("leads").select("*").eq("id", crmId).maybeSingle();
    lead = data;
  }
  if (!lead && ev.contato.telefone) {
    const tel = normalizePhone(ev.contato.telefone);
    const fim = digits(ev.contato.telefone).slice(-4);
    if (tel && fim.length === 4) {
      const { data } = await sb.from("leads").select("*").ilike("phone", `%${fim}`).limit(50);
      lead = (data ?? []).find((l) => normalizePhone(String(l.phone ?? "")) === tel) ?? null;
    }
  }
  if (!lead) return Response.json({ ok: true, ignorado: "lead não encontrado no CRM" });

  const { data: fRows } = await sb.from("funnels").select("*").eq("id", lead.funnel_id as string);
  const funnels = (fRows ?? []).map(mapFunnel);
  const r = aplicarEsteira(
    {
      funnelId: (lead.funnel_id as string) ?? null,
      stageId: (lead.stage_id as string) ?? null,
      converted: !!lead.converted,
      followUp: (lead.follow_up as string) ?? "",
      eloContatos: Number(lead.elo_contatos) || 0,
      eloRespostas: Number(lead.elo_respostas) || 0,
      eloStatus: (lead.elo_status as string) ?? null,
      eloCadencia: (lead.elo_cadencia as string) ?? null,
    },
    funnels,
    ev,
  );
  const activities = [...((lead.activities as unknown[]) ?? []), ...r.atividades];
  const { error } = await sb.from("leads").update({ ...r.patch, ...(r.atividades.length ? { activities } : {}) }).eq("id", lead.id as string);
  if (error) {
    const falta = /elo_/i.test(error.message);
    return Response.json({ erro: falta ? "Rode o supabase/esteira-elo.sql no banco do CRM" : error.message }, { status: 500 });
  }
  return Response.json({ ok: true, lead_id: lead.id, etapa: r.moverPara?.name ?? null, atividades: r.atividades.length });
}
