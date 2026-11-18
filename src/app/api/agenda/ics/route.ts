import { crmAdmin } from "@/server/admin";
import { mapAgenda } from "@/lib/mappers";
import { gerarIcs } from "@/lib/ics";
import type { Compromisso } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/agenda/ics?token=…&tipo=diagnostico&responsavel=…
 *
 * Feed de calendário assinável. O celular (Google Agenda, Calendário do iPhone, Outlook)
 * guarda este endereço e busca de hora em hora — não precisa exportar nada à mão.
 *
 * O token não dá acesso ao CRM: só lê a agenda, e serve para o endereço não ficar público.
 * Fica em `settings.agenda_token`, gerado na própria tela da Agenda.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  if (!token) return texto("Informe o token do feed.", 401);

  const sb = crmAdmin();
  if (!sb) return texto("SUPABASE_SERVICE_ROLE_KEY não configurado no CRM.", 503);

  const { data: cfg } = await sb.from("settings").select("value").eq("key", "agenda_token").maybeSingle();
  const esperado = (cfg?.value || "").trim();
  if (!esperado) return texto("Nenhum endereço de agenda foi gerado ainda. Abra a Agenda no CRM e gere o link.", 404);
  if (!seguro(token, esperado)) return texto("Token inválido.", 403);

  // janela: 6 meses para trás (histórico no celular) e 18 para frente
  const hoje = new Date();
  const de = iso(new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1));
  const ate = iso(new Date(hoje.getFullYear(), hoje.getMonth() + 18, 1));

  let q = sb.from("agenda").select("*").gte("data", de).lte("data", ate).order("data");
  const tipo = url.searchParams.get("tipo");
  if (tipo) q = q.eq("tipo", tipo);
  const responsavel = url.searchParams.get("responsavel");
  if (responsavel) q = q.eq("responsavel_nome", responsavel);

  const { data, error } = await q;
  if (error) return texto(`Erro ao ler a agenda: ${error.message}`, 500);

  const itens: Compromisso[] = (data ?? []).map(mapAgenda).filter((c) => c.status !== "cancelado" || true);
  const nome = tipo ? `ThiagoCRM · ${tipo}` : responsavel ? `ThiagoCRM · ${responsavel}` : "ThiagoCRM · Agenda";
  const ics = gerarIcs(itens, { nome, urlCrm: `${url.origin}/agenda`, dominio: url.hostname });

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="thiagocrm-agenda.ics"',
      // o Google guarda em cache por conta própria; isto evita respostas velhas em outros clientes
      "cache-control": "no-cache, must-revalidate",
    },
  });
}

function texto(msg: string, status: number) {
  return new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Comparação de tempo constante: não deixa descobrir o token tentando letra por letra. */
function seguro(a: string, b: string) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}
