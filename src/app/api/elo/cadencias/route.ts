import { autorizar, SERVER_IS_DEMO } from "@/server/auth";
import { ELO_CONFIGURED, eloApi } from "@/server/elo";

const DEMO = [
  { id: "cd-quente", nome: "Lead quente · diário", intervalo_dias: 1, total_contatos: 5 },
  { id: "cd-frio", nome: "Lead frio · 12 toques", intervalo_dias: 1, total_contatos: 12 },
  { id: "cd-retomada", nome: "Retomada · a cada 2 dias", intervalo_dias: 2, total_contatos: 5 },
];

/** Cadências ativas no Elo (para escolher ao enviar leads). */
export async function GET(req: Request) {
  const auth = await autorizar(req);
  if (!auth.ok) return Response.json({ erro: auth.erro }, { status: auth.status });
  if (!ELO_CONFIGURED) return Response.json(SERVER_IS_DEMO ? DEMO : []);
  const r = await eloApi<unknown[]>("cadencias");
  if (!r.ok) return Response.json({ erro: r.data.erro ?? "Erro ao buscar cadências" }, { status: r.status === 404 ? 501 : r.status });
  return Response.json(r.data);
}
