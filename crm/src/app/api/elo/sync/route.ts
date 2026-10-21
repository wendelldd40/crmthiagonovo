import { autorizar, SERVER_IS_DEMO } from "@/server/auth";
import { ELO_CONFIGURED, enviarContato, sanitize } from "@/server/elo";
import type { EloResult } from "@/lib/elo";
import { pool } from "@/lib/utils";

export const maxDuration = 60;

const MAX_POR_LOTE = 50;

/** POST { contacts: EloContactPayload[] } → { results: EloResult[] } */
export async function POST(req: Request) {
  const auth = await autorizar(req);
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const list: unknown[] = Array.isArray(body?.contacts) ? body.contacts : [];
  if (!list.length) return Response.json({ erro: "Nenhum contato enviado" }, { status: 400 });
  if (list.length > MAX_POR_LOTE) return Response.json({ erro: `Máximo de ${MAX_POR_LOTE} contatos por lote` }, { status: 400 });

  const limpos = list.map((c) => ({ raw: c as { crmId?: string }, ok: sanitize(c) }));

  // Demonstração sem Elo configurado: simula a resposta para a tela funcionar.
  if (!ELO_CONFIGURED && SERVER_IS_DEMO) {
    await new Promise((r) => setTimeout(r, 350));
    const results: EloResult[] = limpos.map(({ raw, ok }) =>
      ok ? { crmId: ok.crmId, ok: true, eloId: `demo-${ok.telefone}` } : { crmId: String(raw?.crmId ?? ""), ok: false, erro: "Dados inválidos" },
    );
    return Response.json({ results, simulado: true });
  }
  if (!ELO_CONFIGURED) {
    return Response.json({ erro: "Integração com o Elo não configurada no servidor (ELO_API_URL e ELO_API_KEY)." }, { status: 503 });
  }

  const results = await pool(limpos, 4, async ({ raw, ok }): Promise<EloResult> =>
    ok ? enviarContato(ok) : { crmId: String(raw?.crmId ?? ""), ok: false, erro: "Dados inválidos" },
  );
  return Response.json({ results });
}
