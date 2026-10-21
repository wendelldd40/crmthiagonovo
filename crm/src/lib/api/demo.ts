"use client";
/* Modo demonstração: banco fictício no localStorage, no mesmo formato das tabelas reais. */
import type { UserRow } from "@/lib/types";
import { addDays, today, uid } from "@/lib/utils";
import type { Backend, RawSnapshot, Row, Table } from "./types";

const KEY = "thiagocrm-demo-v3";
const AUTH = "thiagocrm-demo-auth";

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function seed(): RawSnapshot & { users: UserRow[] } {
  const r = rnd(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const t = today();
  const st = (name: string, color: string) => ({ id: uid(), name, color });

  const ig = { id: uid(), name: "Instagram DM", icon: "📸", color: "#2d9d8f", stages: [st("Lead novo", "#2563eb"), st("Primeiro contato", "#7c3aed"), st("Qualificação", "#d97706"), st("Proposta enviada", "#c4603a"), st("Negociação", "#e11d48"), st("Fechado", "#059669")] };
  const ind = { id: uid(), name: "Indicações e eventos", icon: "🤝", color: "#7c3aed", stages: [st("Lead novo", "#2563eb"), st("Em contato", "#7c3aed"), st("Proposta", "#d97706"), st("Fechado", "#059669")] };
  const ges = { id: uid(), name: "Gestores — planilha", icon: "📊", color: "#2563eb", stages: [st("Lead novo", "#2563eb"), st("Em contato", "#7c3aed"), st("Reunião marcada", "#d97706"), st("Fechado", "#059669")] };
  const aut = { id: uid(), name: "Autônomos — planilha", icon: "🩺", color: "#059669", stages: [st("Lead novo", "#2563eb"), st("Em contato", "#7c3aed"), st("Reunião marcada", "#d97706"), st("Fechado", "#059669")] };
  const funnels = [ig, ind, ges, aut];

  const nomes = ["Camila Rocha", "Rafael Menezes", "Juliana Prado", "Dr. Henrique Sá", "Larissa Fontes", "Bruno Teixeira", "Patrícia Lemos", "Gustavo Arantes", "Fernanda Quintela", "Diego Carvalho", "Aline Barreto", "Marcelo Duarte", "Beatriz Nogueira", "Igor Pacheco", "Renata Viana", "Lucas Amaral", "Mariana Couto", "Thiago Lins", "Vanessa Brito", "Eduardo Paiva", "Gabriela Moura", "Samuel Rezende", "Helena Cardoso", "Felipe Bastos", "Natália Freire", "Ricardo Gomes", "Bianca Reis", "André Lacerda"];
  const clinicas = ["Clínica Patas & Cia", "Hospital Vet Aracaju", "VetCare Jardins", "Pet Center Atalaia", "Clínica São Francisco", "Consultório Bicho Feliz", "", "", "Vet Express Farolândia", "Animale Clínica"];
  const leads: Row[] = [];
  const act = (text: string, daysAgo: number) => ({ text, time: new Date(Date.now() - daysAgo * 86400000).toISOString() });

  nomes.forEach((name, i) => {
    const f = i % 4 === 3 ? ind : ig;
    const si = Math.floor(r() * f.stages.length);
    const ageDays = Math.floor(r() * 80) + 1;
    const origin = f === ind ? pick(["indicacao", "evento", "organico", "whatsapp"]) : pick(["ig_comentario", "ig_comentario", "ig_seguidor", "whatsapp"]);
    const isLast = si === f.stages.length - 1;
    const lastTouch = Math.max(0, ageDays - Math.floor(r() * ageDays));
    const fu = r();
    const user = name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    leads.push({
      id: uid(),
      name,
      email: r() > 0.5 ? `${user}@email.com` : null,
      phone: r() > 0.25 ? `79 9${8000 + Math.floor(r() * 1999)}-${1000 + Math.floor(r() * 8999)}` : null,
      instagram: origin.startsWith("ig") ? `@${user}.vet` : null,
      company: pick(clinicas) || null,
      origin,
      is_vet: r() > 0.22,
      funnel_id: f.id,
      stage_id: f.stages[si].id,
      value: pick([0, 1500, 2400, 3600, 4800, 6000, 9600, 12000]),
      tags: r() > 0.7 ? [pick(["quente", "vip", "retorno"])] : [],
      notes: r() > 0.6 ? "Tem clínica há 4 anos, quer organizar o financeiro antes de contratar." : null,
      follow_up: fu < 0.12 ? addDays(t, -2) : fu < 0.24 ? t : fu < 0.4 ? addDays(t, 3) : null,
      converted: isLast,
      converted_date: isLast ? addDays(t, -lastTouch) : null,
      service_months: isLast ? pick([3, 6, 6, 12]) : 0,
      activities: [act("Lead criado", ageDays), ...(lastTouch < ageDays ? [act(`Movido para "${f.stages[si].name}"`, lastTouch)] : [])],
      date: addDays(t, -ageDays),
      created_at: new Date(Date.now() - ageDays * 86400000).toISOString(),
    });
  });

  // esteira do Elo em andamento para alguns leads (no real, isso chega pelo webhook)
  leads.forEach((l, i) => {
    if (!l.phone || l.converted || i % 3) return;
    const total = i % 2 ? 12 : 5;
    const feitos = 1 + (i % (total === 12 ? 7 : 4));
    l.tags = [...(l.tags as string[]), "elo"];
    Object.assign(l, {
      elo_cadencia: total === 12 ? "Lead frio · 12 toques" : "Lead quente · diário", elo_total: total, elo_contatos: feitos,
      elo_ultimo_contato: addDays(t, -(i % 3)), elo_ultimo_tipo: ["texto", "audio,texto", "ligacao,texto"][i % 3],
      elo_respostas: i % 4 === 0 ? 1 : 0, elo_status: "ativa",
    });
  });

  const planilha = ["Ana Beatriz Lopes", "Carlos Eduardo Pinto", "Maria Clara Antunes", "João Victor Ramos", "Fernanda Sales", "Paulo Henrique Dias", "Júlia Matos", "Rodrigo Farias", "Daniela Campos", "Sérgio Albuquerque", "Priscila Neves", "Marcos Vieira", "Sabrina Lima", "Leonardo Castro", "Tatiana Mello", "Wagner Souza", "Kelly Andrade", "Jorge Batista"];
  planilha.forEach((name, i) => {
    const f = i % 2 ? aut : ges;
    const abordado = i % 5 === 0;
    const ageDays = [20, 45, 70, 120, 200, 300, 400][i % 7];
    leads.push({
      id: uid(),
      name,
      email: null,
      phone: `55 79 9${8100 + i * 37}-${2000 + i * 211}`,
      instagram: null,
      company: f === ges ? pick(clinicas) || null : null,
      origin: "outro",
      is_vet: true,
      funnel_id: f.id,
      stage_id: abordado ? f.stages[1].id : f.stages[0].id,
      value: 0,
      tags: abordado ? ["planilha", "abordado"] : ["planilha"],
      notes: null,
      follow_up: null,
      converted: false,
      converted_date: null,
      service_months: 0,
      activities: [act("Importado da planilha do kit de precificação", ageDays)],
      date: addDays(t, -ageDays),
      created_at: new Date(Date.now() - ageDays * 86400000).toISOString(),
    });
  });

  const tasks: Row[] = [
    { id: uid(), title: "Abordar 15 gestores da planilha", description: "Usar o script global. Marcar como abordado ao enviar.", priority: "urgente", status: "em_andamento", deadline: addDays(t, 1), created_at: new Date().toISOString() },
    { id: uid(), title: "Responder comentários do último Reels", description: "Puxar para DM quem perguntou sobre precificação.", priority: "alta", status: "pendente", deadline: addDays(t, -1), created_at: new Date().toISOString() },
    { id: uid(), title: "Atualizar etapas dos leads de setembro", description: null, priority: "media", status: "pendente", deadline: addDays(t, 4), created_at: new Date().toISOString() },
    { id: uid(), title: "Levantar indicações dos clientes ativos", description: "Perguntar a cada mentorado por 2 contatos.", priority: "baixa", status: "pendente", deadline: null, created_at: new Date().toISOString() },
    { id: uid(), title: "Exportar planilha de leads para o Thiago", description: null, priority: "media", status: "concluida", deadline: addDays(t, -3), created_at: new Date().toISOString() },
  ];

  const mStart = (m: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m, 1);
    return today(d);
  };
  const ment = (client: string, type: string, hps: number, spm: number, months: number, start: string, value: number, sched: Row): Row => {
    const end = (() => {
      const d = new Date(start + "T00:00:00");
      d.setMonth(d.getMonth() + months);
      return today(d);
    })();
    return { id: uid(), client, type, hours_per_session: hps, sessions_per_week: spm, total_weeks: months, start_date: start, end_date: end, active: true, value, notes: null, schedule_type: "nenhuma", schedule_day_of_week: null, schedule_day_of_month: null, schedule_interval_days: null, schedule_sessions: [], ...sched };
  };
  const sessionsWeekly = (start: string, dow: number, months: number, step = 7) => {
    const out: string[] = [];
    const d = new Date(start + "T00:00:00");
    const end = new Date(start + "T00:00:00");
    end.setMonth(end.getMonth() + months);
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    while (d <= end) {
      out.push(today(d));
      d.setDate(d.getDate() + step);
    }
    return out;
  };
  const s1 = mStart(-2);
  const s2 = mStart(-1);
  const mentorships: Row[] = [
    ment("Clínica Patas & Cia", "Mentoria Individual", 1.5, 4, 6, s1, 2400, { schedule_type: "semanal", schedule_day_of_week: [2], schedule_sessions: sessionsWeekly(s1, 2, 6) }),
    ment("Hospital Vet Aracaju", "Acompanhamento Mensal", 2, 2, 12, s2, 3600, { schedule_type: "quinzenal", schedule_day_of_week: [4], schedule_sessions: sessionsWeekly(s2, 4, 12, 14) }),
    ment("Turma Gestão 2026", "Mentoria em Grupo", 2, 4, 4, mStart(0), 4800, { schedule_type: "semanal", schedule_day_of_week: [1], schedule_sessions: sessionsWeekly(mStart(0), 1, 4) }),
    { ...ment("VetCare Jardins", "Consultoria Avulsa", 3, 1, 2, mStart(-5), 1800, {}), active: false },
  ];

  return {
    funnels,
    leads,
    tasks,
    mentorships,
    settings: [{ key: "estagiario_obs", value: "Thiago, separei 6 leads da planilha que já responderam. Preciso de um horário seu na quinta para reunião com a Ana Beatriz." }],
    users: [
      { id: "demo-admin", email: "thiago@demo.local", name: "Thiago Alemão", role: "admin", avatar: "T", created_at: "2025-01-01" },
      { id: "demo-wendell", email: "wendell@demo.local", name: "Wendell", role: "estagiario", avatar: "W", created_at: "2025-02-01" },
      { id: "demo-mkt", email: "mariaclara@demo.local", name: "Maria Clara", role: "marketing", avatar: "M", created_at: "2025-03-01" },
    ],
  };
}

type DB = ReturnType<typeof seed>;

function read(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  write(s);
  return s;
}

function write(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const demoBackend: Backend = {
  async session() {
    let id: string | null = null;
    try {
      id = localStorage.getItem(AUTH);
    } catch {}
    if (!id) return null;
    const u = read().users.find((x) => x.id === id) ?? read().users[0];
    return { id: u.id, email: u.email, name: u.name, role: u.role, avatar: u.avatar || u.name[0] };
  },
  async signIn() {
    await wait(300);
    try {
      localStorage.setItem(AUTH, "demo-admin");
    } catch {}
    return null;
  },
  async signOut() {
    try {
      localStorage.removeItem(AUTH);
    } catch {}
  },
  async accessToken() {
    return "demo";
  },
  async getLead(id) {
    return read().leads.find((l) => l.id === id) ?? null;
  },
  async loadAll() {
    await wait(250);
    const db = read();
    return { funnels: db.funnels, leads: db.leads, tasks: db.tasks, mentorships: db.mentorships, settings: db.settings };
  },
  async insert(table: Table, row: Row) {
    await wait();
    const db = read();
    const full = { id: uid(), created_at: new Date().toISOString(), ...row };
    (db[table] as Row[]).push(full);
    write(db);
    return full;
  },
  async insertMany(table, rows) {
    await wait();
    const db = read();
    const full = rows.map((row) => ({ id: uid(), created_at: new Date().toISOString(), ...row }));
    (db[table] as Row[]).push(...full);
    write(db);
    return full;
  },
  async update(table, id, patch) {
    await wait(60);
    const db = read();
    const list = db[table] as Row[];
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], ...patch };
    write(db);
  },
  async remove(table, id) {
    await wait();
    const db = read();
    (db as unknown as Record<Table, Row[]>)[table] = (db[table] as Row[]).filter((x) => x.id !== id);
    write(db);
  },
  async removeWhere(table, col, value) {
    const db = read();
    (db as unknown as Record<Table, Row[]>)[table] = (db[table] as Row[]).filter((x) => x[col] !== value);
    write(db);
  },
  async setSetting(key, value) {
    const db = read();
    const s = db.settings.find((x) => x.key === key);
    if (s) s.value = value;
    else db.settings.push({ key, value });
    write(db);
  },
  async listUsers() {
    await wait();
    return read().users;
  },
  async updateUser(id, patch) {
    const db = read();
    const u = db.users.find((x) => x.id === id);
    if (u) Object.assign(u, patch);
    write(db);
  },
};
