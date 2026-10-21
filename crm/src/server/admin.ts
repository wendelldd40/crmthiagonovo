import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a service_role do Supabase DO CRM. Só existe no servidor (rota do webhook do Elo),
 * porque o Elo não tem login no CRM. Nunca use NEXT_PUBLIC_ nesta chave.
 */
let admin: SupabaseClient | null = null;
export function crmAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}
