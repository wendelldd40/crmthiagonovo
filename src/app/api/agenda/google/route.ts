import { crmAdmin } from "@/server/admin";
import { autorizar } from "@/server/auth";
import { mapAgenda } from "@/lib/mappers";
import { apagarEvento, googleConfig, gravarEvento, testarLigacao } from "@/server/google-agenda";

export const dynamic = "force-dynamic";

/**
 * Ponte entre a agenda do CRM e o calendário do Google.
 *
 * A chave da conta de serviço fica só aqui no servidor — o navegador nunca a vê.
 * O compromisso é relido do banco antes de ir para o Google, então o que vai para
 * o calendário é o que está gravado, não o que o navegador mandou.
 *
 * GET    → estado da ligação (para a tela mostrar se está no ar)
 * POST   { id }  → cria ou atualiza o evento daquele compromisso
 * DELETE { id, googleEventId } → tira o evento do calendário
 */

export async function GET() {
  const cfg = googleConfig();
  if (!cfg) return Response.json({ ligado: false });
  const r = await testarLigacao();
  return Response.json({ ligado: true, conta: cfg.email, calendario: cfg.calendario, ...r });
}

export async function POST(req: Request) {
  const guarda = await exigirLogin(req);
  if (guarda) return guarda;

  const cfg = googleConfig();
  if (!cfg) return Response.json({ pulado: true, motivo: "Ligação com o Google não configurada." });

  const { id, urlCrm } = (await req.json().catch(() => ({}))) as { id?: string; urlCrm?: string };
  if (!id) return Response.json({ erro: "Informe o compromisso." }, { status: 400 });

  const sb = crmAdmin();
  if (!sb) return Response.json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurado." }, { status: 503 });

  const { data, error } = await sb.from("agenda").select("*").eq("id", id).maybeSingle();
  if (error || !data) return Response.json({ erro: "Compromisso não encontrado." }, { status: 404 });

  try {
    const eventoId = await gravarEvento(mapAgenda(data), urlCrm);
    // guarda o id para a próxima edição achar o mesmo evento
    if (eventoId && eventoId !== data.google_event_id) {
      await sb.from("agenda").update({ google_event_id: eventoId }).eq("id", id);
    }
    return Response.json({ ok: true, googleEventId: eventoId });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Falha ao falar com o Google." }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const guarda = await exigirLogin(req);
  if (guarda) return guarda;

  if (!googleConfig()) return Response.json({ pulado: true });

  const { googleEventId } = (await req.json().catch(() => ({}))) as { googleEventId?: string };
  if (!googleEventId) return Response.json({ ok: true });

  try {
    await apagarEvento(googleEventId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Falha ao falar com o Google." }, { status: 502 });
  }
}

/** Só quem está logado no CRM e pode editar mexe no calendário. */
async function exigirLogin(req: Request) {
  const a = await autorizar(req);
  if (a.ok) return null;
  const erro = a.status === 403 ? "Seu perfil não pode mexer na agenda." : a.erro;
  return Response.json({ erro }, { status: a.status });
}
