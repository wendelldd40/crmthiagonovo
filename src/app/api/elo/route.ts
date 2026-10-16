import { autorizar, SERVER_IS_DEMO } from "@/server/auth";
import { ELO_CONFIGURED, ELO_URL } from "@/server/elo";

/** Estado da integração (sem revelar a chave). */
export async function GET(req: Request) {
  const auth = await autorizar(req);
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });
  let host: string | null = null;
  try {
    host = ELO_CONFIGURED ? new URL(ELO_URL).host : null;
  } catch {}
  const retorno = !!(process.env.ELO_WEBHOOK_SECRET ?? "").trim() && !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  return Response.json({ configurado: ELO_CONFIGURED, host, simulado: !ELO_CONFIGURED && SERVER_IS_DEMO, retorno });
}
