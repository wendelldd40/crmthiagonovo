"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { CurrentUser, Role, UserRow } from "@/lib/types";
import type { Backend, Row, Table } from "./types";

let client: SupabaseClient | null = null;
function sb() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** O PostgREST corta selects em 1000 linhas; busca tudo em blocos (igual ao CRM antigo). */
async function fetchAll(table: string, order = "created_at", page = 1000) {
  let all: Row[] = [];
  for (let from = 0; from <= 100_000; from += page) {
    const { data, error } = await sb().from(table).select("*").order(order).range(from, from + page - 1);
    if (error) throw error;
    all = all.concat(data ?? []);
    if (!data || data.length < page) break;
  }
  return all;
}

/** Igual ao fetchAll, mas volta vazio se a tabela ainda não existe (quem não rodou supabase/agenda.sql). */
async function fetchOptional(table: string, order = "data") {
  try {
    return await fetchAll(table, order);
  } catch {
    return [] as Row[];
  }
}

async function profile(id: string, email: string): Promise<CurrentUser> {
  const { data } = await sb().from("user_profiles").select("*").eq("id", id).single();
  const role = (data?.role as Role) || "estagiario";
  const name = data?.name || email.split("@")[0];
  return { id, email, name, role, avatar: data?.avatar || name[0].toUpperCase() };
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const supabaseBackend: Backend = {
  watchLeads(on) {
    // precisa da tabela leads na publicação supabase_realtime (supabase/realtime-leads.sql)
    const ch = sb()
      .channel("crm-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (p) => {
        const tipo = p.eventType as "INSERT" | "UPDATE" | "DELETE";
        on(tipo, (tipo === "DELETE" ? p.old : p.new) as Row);
      })
      .subscribe();
    return () => void sb().removeChannel(ch);
  },
  watchAgenda(on) {
    // precisa da tabela agenda na publicação supabase_realtime (supabase/agenda.sql)
    const ch = sb()
      .channel("crm-agenda")
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda" }, (p) => {
        const tipo = p.eventType as "INSERT" | "UPDATE" | "DELETE";
        on(tipo, (tipo === "DELETE" ? p.old : p.new) as Row);
      })
      .subscribe();
    return () => void sb().removeChannel(ch);
  },
  async session() {
    const { data } = await sb().auth.getSession();
    const u = data.session?.user;
    return u ? profile(u.id, u.email ?? "") : null;
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (!error) return null;
    return error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message;
  },
  async signOut() {
    await sb().auth.signOut();
  },
  async accessToken() {
    const { data } = await sb().auth.getSession();
    return data.session?.access_token ?? null;
  },
  async getLead(id) {
    const { data } = await sb().from("leads").select("*").eq("id", id).maybeSingle();
    return (data as Row) ?? null;
  },
  async loadAll() {
    const [funnels, leads, tasks, mentorships, agenda, s] = await Promise.all([
      fetchAll("funnels"),
      fetchAll("leads"),
      fetchAll("tasks"),
      fetchAll("mentorships"),
      fetchOptional("agenda"),
      sb().from("settings").select("*"),
    ]);
    return { funnels, leads, tasks, mentorships, agenda, settings: (s.data ?? []) as { key: string; value: string }[] };
  },
  async insert(table: Table, row: Row) {
    const { data, error } = await sb().from(table).insert(row).select().single();
    check(error);
    return data as Row;
  },
  async insertMany(table, rows) {
    if (!rows.length) return [];
    const { data, error } = await sb().from(table).insert(rows).select();
    check(error);
    return (data ?? []) as Row[];
  },
  async update(table, id, patch) {
    const { error } = await sb().from(table).update(patch).eq("id", id);
    check(error);
  },
  async updateMany(table, ids, patch) {
    // em lotes: uma lista enorme de ids estoura o tamanho da URL do PostgREST
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await sb().from(table).update(patch).in("id", ids.slice(i, i + 200));
      check(error);
    }
  },
  async remove(table, id) {
    const { error } = await sb().from(table).delete().eq("id", id);
    check(error);
  },
  async removeWhere(table, col, value) {
    const { error } = await sb().from(table).delete().eq(col, value);
    check(error);
  },
  async setSetting(key, value) {
    const { error } = await sb().from("settings").upsert({ key, value });
    check(error);
  },
  async listUsers() {
    const { data, error } = await sb().from("users_with_email").select("*").order("created_at");
    check(error);
    return (data ?? []) as UserRow[];
  },
  async updateUser(id, patch) {
    const { error } = await sb().from("user_profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    check(error);
  },
};
