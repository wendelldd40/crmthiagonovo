import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVER_IS_DEMO = !URL || !ANON;

const PODE_ENVIAR = new Set(["admin", "dev", "estagiario"]);

/**
 * Confere o token do Supabase enviado pelo navegador e o perfil do usuário.
 * Usa a chave pública + o token do próprio usuário: as regras de acesso (RLS) do banco continuam valendo.
 */
export async function autorizar(req: Request): Promise<{ ok: true; nome: string } | { ok: false; status: number; erro: string }> {
  if (SERVER_IS_DEMO) {
    return req.headers.get("x-crm-demo") === "1" ? { ok: true, nome: "Demonstração" } : { ok: false, status: 401, erro: "Servidor sem Supabase configurado" };
  }
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, erro: "Sessão expirada. Entre de novo no CRM." };
  const sb = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, erro: "Sessão expirada. Entre de novo no CRM." };
  const { data: perfil } = await sb.from("user_profiles").select("role,name").eq("id", data.user.id).single();
  const role = perfil?.role ?? "estagiario";
  if (!PODE_ENVIAR.has(role)) return { ok: false, status: 403, erro: "Seu perfil não pode enviar contatos ao Elo." };
  return { ok: true, nome: perfil?.name ?? data.user.email ?? "" };
}
