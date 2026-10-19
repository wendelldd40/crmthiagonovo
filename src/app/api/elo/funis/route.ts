import { crmAdmin } from "@/server/admin";
import { chamadaDoEloValida } from "@/server/elo-assinatura";
import { mapFunnel } from "@/lib/mappers";

export const dynamic = "force-dynamic";

/**
 * GET /api/elo/funis — o Elo lista os funis e etapas do CRM para o atendente escolher
 * onde o lead nasce quando o primeiro contato é feito pelo Elo.
 * Autenticação: X-Elo-Timestamp + X-Elo-Signature (HMAC com o segredo do webhook).
 */
export async function GET(req: Request) {
  const auth = chamadaDoEloValida(req, "/api/elo/funis");
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });
  const sb = crmAdmin();
  if (!sb) return Response.json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurado no CRM" }, { status: 503 });
  const { data, error } = await sb.from("funnels").select("*").order("created_at");
  if (error) return Response.json({ erro: error.message }, { status: 500 });
  const funis = (data ?? [])
    .map(mapFunnel)
    .map((f) => ({ id: f.id, nome: f.name, etapas: f.stages.map((s) => ({ id: s.id, nome: s.name })) }));
  return Response.json({ funis });
}
