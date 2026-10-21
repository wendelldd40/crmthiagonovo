import { autorizar, SERVER_IS_DEMO } from "@/server/auth";
import { ELO_CONFIGURED, eloApi } from "@/server/elo";
import { normalizePhone } from "@/lib/utils";

/** Registra no Elo um contato feito fora do WhatsApp (ligação). O Elo devolve a contagem pelo webhook. */
export async function POST(req: Request) {
  const auth = await autorizar(req);
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const telefone = normalizePhone(String(body.telefone ?? ""));
  if (!telefone) return Response.json({ erro: "Lead sem WhatsApp válido" }, { status: 400 });
  const nota = body.nota ? String(body.nota).slice(0, 500) : undefined;
  if (!ELO_CONFIGURED) {
    if (SERVER_IS_DEMO) return Response.json({ ok: true, simulado: true });
    return Response.json({ erro: "Integração com o Elo não configurada" }, { status: 503 });
  }
  const r = await eloApi<{ ok?: boolean; esteira?: unknown }>("toques", { method: "POST", body: { telefone, tipo: "ligacao", nota: nota ? `${nota} (por ${auth.nome})` : `Registrada por ${auth.nome}` } });
  if (!r.ok) return Response.json({ erro: r.data.erro ?? "Erro ao registrar no Elo" }, { status: r.status });
  return Response.json({ ok: true, esteira: r.data.esteira ?? null });
}
