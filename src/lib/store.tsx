"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { IS_DEMO, SETTING, TAG_ABORDADO, TAG_ELO } from "./config";
import { demoBackend } from "./api/demo";
import { supabaseBackend } from "./api/supabase";
import type { Backend } from "./api/types";
import { leadPatchToDb, leadToDb, mapFunnel, mapLead, mapMentorship, mapTask, mentorshipToDb, taskToDb } from "./mappers";
import type { CurrentUser, Funnel, Lead, Mentorship, Stage, Task, TaskStatus } from "./types";
import { ROLE_CAN_EDIT, ROLE_PAGES, type PageKey } from "./constants";
import { findFunnel, findStage, leadPerfil } from "./domain";
import { prepareLead, type EloResult } from "./elo";
import { addDays, fmtDate, pool, today } from "./utils";

export const backend: Backend = IS_DEMO ? demoBackend : supabaseBackend;

/* ───────── Toasts ───────── */
export type ToastTone = "ok" | "error" | "info";
export interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
}

/* ───────── Diálogos globais ───────── */
export type DialogState =
  | { kind: "lead"; leadId?: string; funnelId?: string; stageId?: string }
  | { kind: "funnel"; funnelId?: string }
  | { kind: "stages"; funnelId: string }
  | { kind: "move"; leadId: string }
  | { kind: "task"; taskId?: string }
  | { kind: "mentorship"; mentorshipId?: string }
  | { kind: "elo"; leadIds: string[] }
  | { kind: "confirm"; title: string; body: string; confirm: string; run: () => Promise<void> | void }
  | null;

export interface EloSyncSummary {
  enviados: number;
  falhas: { crmId: string; nome: string; erro: string }[];
  ignorados: { crmId: string; nome: string; motivo: string }[];
}

interface Ctx {
  ready: boolean;
  loadError: string | null;
  user: CurrentUser | null;
  funnels: Funnel[];
  leads: Lead[];
  tasks: Task[];
  mentorships: Mentorship[];
  settings: Record<string, string>;
  reload: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  can: (page: PageKey) => boolean;
  canEdit: boolean;

  activeFunnelId: string | null;
  setActiveFunnelId: (id: string) => void;
  detailId: string | null;
  openLead: (id: string) => void;
  closeLead: () => void;
  dialog: DialogState;
  setDialog: (d: DialogState) => void;
  toasts: ToastItem[];
  toast: (text: string, tone?: ToastTone, action?: ToastItem["action"]) => void;
  dismissToast: (id: number) => void;
  confirm: (title: string, body: string, confirmLabel: string, run: () => Promise<void> | void) => void;

  saveLead: (data: Omit<Lead, "id" | "activities" | "date" | "elo">, editingId?: string) => Promise<Lead | null>;
  /** importação em lote (planilha / Google). Envia ao Elo se o envio automático estiver ligado. */
  importLeads: (rows: Omit<Lead, "id" | "elo">[], onProgress?: (feitos: number, total: number) => void) => Promise<{ criados: Lead[]; erro?: string; elo?: EloSyncSummary }>;
  patchLead: (id: string, patch: Partial<Lead>, activity?: string) => Promise<boolean>;
  moveLeadTo: (id: string, funnelId: string, stageId: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addNote: (id: string, text: string) => Promise<void>;
  snoozeFollowUp: (id: string, days: number) => Promise<void>;
  markFollowUpDone: (id: string) => Promise<void>;
  markAbordado: (id: string) => Promise<void>;

  saveFunnel: (data: Omit<Funnel, "id">, editingId?: string) => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
  saveStages: (funnelId: string, stages: Stage[]) => Promise<void>;

  saveTask: (data: Omit<Task, "id" | "createdAt">, editingId?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  saveMentorship: (data: Omit<Mentorship, "id">, editingId?: string) => Promise<void>;
  deleteMentorship: (id: string) => Promise<void>;

  setSetting: (key: string, value: string) => Promise<void>;
  syncToElo: (ids: string[], extraTags: string[], onProgress?: (done: number, total: number) => void, cadencia?: { nome: string; zerar: boolean }) => Promise<EloSyncSummary>;
  registrarLigacao: (id: string, nota: string) => Promise<boolean>;
}

const C = createContext<Ctx | null>(null);

export function useCRM() {
  const c = useContext(C);
  if (!c) throw new Error("useCRM fora do CRMProvider");
  return c;
}

const now = () => new Date().toISOString();

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mentorships, setMentorships] = useState<Mentorship[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activeFunnelId, setActiveFunnelIdState] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  // refs para ler o estado mais recente dentro de ações assíncronas
  const leadsRef = useRef(leads);
  const funnelsRef = useRef(funnels);
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    leadsRef.current = leads;
    funnelsRef.current = funnels;
    settingsRef.current = settings;
  }, [leads, funnels, settings]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: ToastTone = "ok", action?: ToastItem["action"]) => {
      const id = ++toastSeq.current;
      setToasts((t) => [...t.slice(-3), { id, text, tone, action }]);
      setTimeout(() => dismissToast(id), action ? 6000 : 3200);
    },
    [dismissToast],
  );
  const fail = useCallback((e: unknown) => toast(e instanceof Error ? e.message : String(e), "error"), [toast]);

  const load = useCallback(async () => {
    try {
      const u = await backend.session();
      setLoadError(null);
      setUser(u);
      if (!u) {
        setReady(true);
        return;
      }
      const raw = await backend.loadAll();
      const fs = raw.funnels.map(mapFunnel);
      setFunnels(fs);
      setLeads(raw.leads.map(mapLead));
      setTasks(raw.tasks.map(mapTask));
      setMentorships(raw.mentorships.map(mapMentorship));
      setSettings(Object.fromEntries(raw.settings.map((s) => [s.key, s.value ?? ""])));
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("crm-funil-ativo");
      } catch {}
      setActiveFunnelIdState(fs.find((f) => f.id === saved)?.id ?? fs[0]?.id ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Falha ao conectar com o banco de dados");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const setActiveFunnelId = useCallback((id: string) => {
    setActiveFunnelIdState(id);
    try {
      localStorage.setItem("crm-funil-ativo", id);
    } catch {}
  }, []);

  const can = useCallback((p: PageKey) => !!user && ROLE_PAGES[user.role].includes(p), [user]);
  const canEdit = !!user && ROLE_CAN_EDIT[user.role];

  const signIn = useCallback(
    async (email: string, pass: string) => {
      const err = await backend.signIn(email, pass);
      if (!err) {
        setReady(false);
        await load();
      }
      return err;
    },
    [load],
  );
  const signOut = useCallback(async () => {
    await backend.signOut();
    setUser(null);
    setLeads([]);
    setFunnels([]);
    setTasks([]);
    setMentorships([]);
  }, []);

  const confirm = useCallback<Ctx["confirm"]>((title, body, confirmLabel, run) => setDialog({ kind: "confirm", title, body, confirm: confirmLabel, run }), []);

  /* ───────── Elo ───────── */
  const markSentToElo = useCallback(async (ids: string[]) => {
    const at = now();
    await pool(ids, 5, async (id) => {
      const l = leadsRef.current.find((x) => x.id === id);
      if (!l) return;
      const tags = l.tags.includes(TAG_ELO) ? l.tags : [...l.tags, TAG_ELO];
      const first = !l.tags.includes(TAG_ELO);
      const activities = first ? [...l.activities, { text: "Enviado ao Elo (atendimento WhatsApp)", time: at }] : l.activities;
      setLeads((ls) => ls.map((x) => (x.id === id ? { ...x, tags, activities } : x)));
      if (first) await backend.update("leads", id, { tags, activities }).catch(() => {});
    });
  }, []);

  const syncToElo = useCallback<Ctx["syncToElo"]>(
    async (ids, extraTags, onProgress, cadencia) => {
      const fs = funnelsRef.current;
      const summary: EloSyncSummary = { enviados: 0, falhas: [], ignorados: [] };
      const prepared = ids
        .map((id) => leadsRef.current.find((l) => l.id === id))
        .filter((l): l is Lead => !!l)
        .map((l) => prepareLead(l, fs, extraTags, cadencia));
      const contacts = prepared.flatMap((p) => (p.ok ? [p.contact] : []));
      for (const p of prepared) if (!p.ok) summary.ignorados.push({ crmId: p.crmId, nome: p.nome, motivo: p.motivo });
      const token = await backend.accessToken();
      const BATCH = 20;
      const okIds: string[] = [];
      onProgress?.(0, contacts.length);
      for (let i = 0; i < contacts.length; i += BATCH) {
        const batch = contacts.slice(i, i + BATCH);
        let results: EloResult[];
        try {
          const res = await fetch("/api/elo/sync", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token ?? ""}`, "x-crm-demo": IS_DEMO ? "1" : "0" },
            body: JSON.stringify({ contacts: batch }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.erro || `Erro ${res.status}`);
          results = body.results as EloResult[];
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Falha de rede";
          results = batch.map((c) => ({ crmId: c.crmId, ok: false, erro: msg }));
        }
        for (const r of results) {
          if (r.ok) {
            summary.enviados++;
            okIds.push(r.crmId);
          } else {
            const c = batch.find((x) => x.crmId === r.crmId);
            summary.falhas.push({ crmId: r.crmId, nome: c?.nome ?? "", erro: r.erro ?? "Erro" });
          }
        }
        onProgress?.(Math.min(i + BATCH, contacts.length), contacts.length);
      }
      if (okIds.length) await markSentToElo(okIds);
      return summary;
    },
    [markSentToElo],
  );

  /** Envio automático (se ligado nas configurações). Silencioso quando dá certo. */
  const autoSync = useCallback(
    (id: string) => {
      if (settingsRef.current[SETTING.eloAutoSync] !== "true") return;
      const l = leadsRef.current.find((x) => x.id === id);
      if (!l || !prepareLead(l, funnelsRef.current).ok) return;
      const extra = (settingsRef.current[SETTING.eloEtiqueta] || "").split(",").map((s) => s.trim()).filter(Boolean);
      const cad = settingsRef.current[SETTING.eloCadencia];
      // a cadência só é aplicada na primeira vez: o Elo ignora se o contato já está nela
      void syncToElo([id], extra, undefined, cad ? { nome: cad, zerar: false } : undefined).then((s) => {
        if (s.falhas.length) toast(`Elo: ${s.falhas[0].erro}`, "error");
      });
    },
    [syncToElo, toast],
  );

  /** Ligação feita fora do WhatsApp: registra no Elo, que recalcula a esteira e devolve pelo webhook. */
  const registrarLigacao = useCallback(
    async (id: string, nota: string) => {
      const l = leadsRef.current.find((x) => x.id === id);
      if (!l) return false;
      try {
        const token = await backend.accessToken();
        const res = await fetch("/api/elo/toque", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token ?? ""}`, "x-crm-demo": IS_DEMO ? "1" : "0" },
          body: JSON.stringify({ telefone: l.phone, nota }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.erro || `Erro ${res.status}`);
        if (IS_DEMO) {
          // demonstração: simula o que o Elo devolveria (1 contato por dia)
          const hoje = today();
          const e = l.elo ?? { contatos: 0, total: null, cadencia: null, ultimoContato: null, ultimoTipo: null, respostas: 0, ultimaResposta: null, status: null };
          const novoDia = e.ultimoContato !== hoje;
          const elo = { ...e, contatos: e.contatos + (novoDia ? 1 : 0), ultimoContato: hoje, ultimoTipo: novoDia ? "ligacao" : `ligacao,${e.ultimoTipo ?? "texto"}` };
          const text = novoDia ? `${elo.contatos}º contato pelo WhatsApp (ligação${nota ? `: ${nota}` : ""})${e.cadencia ? ` · ${e.cadencia} ${elo.contatos}/${e.total}` : ""}` : `Ligação registrada no mesmo dia de outro contato${nota ? `: ${nota}` : ""}`;
          const activities = [...l.activities, { text, time: now() }];
          setLeads((ls) => ls.map((x) => (x.id === id ? { ...x, elo, activities } : x)));
          await backend.update("leads", id, { elo_contatos: elo.contatos, elo_ultimo_contato: hoje, elo_ultimo_tipo: elo.ultimoTipo, activities });
        } else {
          // o Elo avisa o CRM pelo webhook; busca o lead atualizado logo depois
          setTimeout(async () => {
            const row = await backend.getLead(id).catch(() => null);
            if (row) setLeads((ls) => ls.map((x) => (x.id === id ? mapLead(row) : x)));
          }, 1800);
        }
        toast("Ligação registrada na esteira");
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [fail, toast],
  );

  /* ───────── Leads ───────── */
  const patchLead = useCallback<Ctx["patchLead"]>(
    async (id, patch, activity) => {
      const prev = leadsRef.current.find((l) => l.id === id);
      if (!prev) return false;
      const full: Partial<Lead> = { ...patch };
      if (activity) full.activities = [...(patch.activities ?? prev.activities), { text: activity, time: now() }];
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...full } : l)));
      try {
        await backend.update("leads", id, leadPatchToDb(full));
        return true;
      } catch (e) {
        setLeads((ls) => ls.map((l) => (l.id === id ? prev : l)));
        fail(e);
        return false;
      }
    },
    [fail],
  );

  const saveLead = useCallback<Ctx["saveLead"]>(
    async (data, editingId) => {
      try {
        if (editingId) {
          const ex = leadsRef.current.find((l) => l.id === editingId);
          if (!ex) return null;
          const next: Lead = { ...ex, ...data, activities: [...ex.activities, { text: "Lead atualizado", time: now() }] };
          await backend.update("leads", editingId, leadToDb(next));
          setLeads((ls) => ls.map((l) => (l.id === editingId ? next : l)));
          toast("Lead atualizado");
          setTimeout(() => autoSync(editingId), 0);
          return next;
        }
        const row = await backend.insert("leads", leadToDb({ ...data, date: today(), activities: [{ text: "Lead criado", time: now() }] }));
        const l = mapLead(row);
        setLeads((ls) => [...ls, l]);
        toast("Lead criado", "ok", { label: "Abrir", run: () => setDetailId(l.id) });
        setTimeout(() => autoSync(l.id), 0);
        return l;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    [autoSync, fail, toast],
  );

  const importLeads = useCallback<Ctx["importLeads"]>(
    async (rows, onProgress) => {
      const criados: Lead[] = [];
      const LOTE = 100;
      onProgress?.(0, rows.length);
      try {
        for (let i = 0; i < rows.length; i += LOTE) {
          const feitos = await backend.insertMany("leads", rows.slice(i, i + LOTE).map((r) => leadToDb(r)));
          const novos = feitos.map(mapLead);
          criados.push(...novos);
          // o ref precisa enxergar os novos já (o envio ao Elo lê dele antes do próximo render)
          leadsRef.current = [...leadsRef.current, ...novos];
          setLeads((ls) => [...ls, ...novos]);
          onProgress?.(Math.min(i + LOTE, rows.length), rows.length);
        }
      } catch (e) {
        const erro = e instanceof Error ? e.message : String(e);
        return { criados, erro: criados.length ? `${criados.length} importados; o resto falhou: ${erro}` : erro };
      }
      let elo: EloSyncSummary | undefined;
      if (settingsRef.current[SETTING.eloAutoSync] === "true") {
        const ids = criados.filter((l) => prepareLead(l, funnelsRef.current).ok).map((l) => l.id);
        const extra = (settingsRef.current[SETTING.eloEtiqueta] || "").split(",").map((t) => t.trim()).filter(Boolean);
        const cad = settingsRef.current[SETTING.eloCadencia];
        if (ids.length) elo = await syncToElo(ids, extra, undefined, cad ? { nome: cad, zerar: false } : undefined);
      }
      return { criados, elo };
    },
    [syncToElo],
  );

  const moveLeadTo = useCallback<Ctx["moveLeadTo"]>(
    async (id, funnelId, stageId) => {
      const l = leadsRef.current.find((x) => x.id === id);
      if (!l || (l.funnelId === funnelId && l.stageId === stageId)) return;
      const f = findFunnel(funnelsRef.current, funnelId);
      const s = findStage(f, stageId);
      const sameFunnel = l.funnelId === funnelId;
      const text = sameFunnel ? `Movido para "${s?.name ?? stageId}"` : `Movido para "${f?.name} → ${s?.name}"`;
      const ok = await patchLead(id, { funnelId, stageId }, text);
      if (ok) {
        toast(`Movido para ${s?.name ?? "nova etapa"}`);
        autoSync(id);
      }
    },
    [autoSync, patchLead, toast],
  );

  const deleteLead = useCallback(
    async (id: string) => {
      try {
        await backend.remove("leads", id);
        setLeads((ls) => ls.filter((l) => l.id !== id));
        setDetailId((d) => (d === id ? null : d));
        toast("Lead excluído");
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const addNote = useCallback(
    async (id: string, text: string) => {
      if (await patchLead(id, {}, text)) toast("Nota salva");
    },
    [patchLead, toast],
  );

  const snoozeFollowUp = useCallback(
    async (id: string, days: number) => {
      const date = addDays(today(), days);
      if (await patchLead(id, { followUp: date }, `Follow-up adiado por ${days} dia${days > 1 ? "s" : ""}`)) toast(`Próximo contato em ${fmtDate(date)}`);
    },
    [patchLead, toast],
  );

  const markFollowUpDone = useCallback(
    async (id: string) => {
      if (await patchLead(id, { followUp: "" }, "Follow-up realizado")) toast("Follow-up marcado como feito");
    },
    [patchLead, toast],
  );

  const markAbordado = useCallback(
    async (id: string) => {
      const l = leadsRef.current.find((x) => x.id === id);
      if (!l) return;
      const fs = funnelsRef.current;
      const perfil = leadPerfil(l, fs);
      const target = fs.find((f) => {
        const n = f.name.toLowerCase();
        if (perfil === "gestor") return n.includes("gestor");
        if (perfil === "autonomo") return n.includes("autôn") || n.includes("auton");
        return false;
      });
      let stageId = l.stageId;
      if (target) {
        const st = target.stages.find((s) => s.name.toLowerCase().includes("contato")) ?? target.stages[1];
        if (st) stageId = st.id;
      }
      const tags = [...new Set([...l.tags, TAG_ABORDADO])];
      const ok = await patchLead(
        id,
        { tags, stageId, funnelId: target ? target.id : l.funnelId },
        `Abordagem enviada via WhatsApp por ${user?.name || "Wendell"}`,
      );
      if (ok) toast(`${l.name.split(" ")[0]} marcado como abordado`);
    },
    [patchLead, toast, user],
  );

  /* ───────── Funis ───────── */
  const saveFunnel = useCallback<Ctx["saveFunnel"]>(
    async (data, editingId) => {
      try {
        if (editingId) {
          await backend.update("funnels", editingId, data);
          setFunnels((fs) => fs.map((f) => (f.id === editingId ? { ...f, ...data } : f)));
          // leads em etapas removidas voltam para a primeira etapa
          const orphan = leadsRef.current.filter((l) => l.funnelId === editingId && !data.stages.some((s) => s.id === l.stageId));
          if (orphan.length && data.stages[0]) {
            await pool(orphan, 5, (l) => backend.update("leads", l.id, { stage_id: data.stages[0].id }));
            setLeads((ls) => ls.map((l) => (orphan.some((o) => o.id === l.id) ? { ...l, stageId: data.stages[0].id } : l)));
          }
          toast("Funil atualizado");
        } else {
          const row = await backend.insert("funnels", data);
          const f = mapFunnel(row);
          setFunnels((fs) => [...fs, f]);
          setActiveFunnelId(f.id);
          toast("Funil criado");
        }
      } catch (e) {
        fail(e);
      }
    },
    [fail, setActiveFunnelId, toast],
  );

  const deleteFunnel = useCallback(
    async (id: string) => {
      try {
        await backend.removeWhere("leads", "funnel_id", id);
        await backend.remove("funnels", id);
        setFunnels((fs) => fs.filter((f) => f.id !== id));
        setLeads((ls) => ls.filter((l) => l.funnelId !== id));
        setActiveFunnelIdState((a) => (a === id ? (funnelsRef.current.find((f) => f.id !== id)?.id ?? null) : a));
        toast("Funil excluído");
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const saveStages = useCallback(
    async (funnelId: string, stages: Stage[]) => {
      const f = funnelsRef.current.find((x) => x.id === funnelId);
      if (!f) return;
      await saveFunnel({ name: f.name, icon: f.icon, color: f.color, stages }, funnelId);
    },
    [saveFunnel],
  );

  /* ───────── Tarefas ───────── */
  const saveTask = useCallback<Ctx["saveTask"]>(
    async (data, editingId) => {
      try {
        if (editingId) {
          await backend.update("tasks", editingId, taskToDb(data));
          setTasks((ts) => ts.map((t) => (t.id === editingId ? { ...t, ...data } : t)));
          toast("Tarefa atualizada");
        } else {
          const row = await backend.insert("tasks", taskToDb(data));
          setTasks((ts) => [...ts, mapTask(row)]);
          toast("Tarefa criada");
        }
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await backend.remove("tasks", id);
        setTasks((ts) => ts.filter((t) => t.id !== id));
        toast("Tarefa excluída");
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const setTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      const prev = tasks.find((t) => t.id === id);
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
      try {
        await backend.update("tasks", id, { status });
      } catch (e) {
        if (prev) setTasks((ts) => ts.map((t) => (t.id === id ? prev : t)));
        fail(e);
      }
    },
    [fail, tasks],
  );

  /* ───────── Mentorias ───────── */
  const saveMentorship = useCallback<Ctx["saveMentorship"]>(
    async (data, editingId) => {
      try {
        if (editingId) {
          await backend.update("mentorships", editingId, mentorshipToDb(data));
          setMentorships((ms) => ms.map((m) => (m.id === editingId ? { ...m, ...data } : m)));
          toast("Mentoria atualizada");
        } else {
          const row = await backend.insert("mentorships", mentorshipToDb(data));
          setMentorships((ms) => [...ms, mapMentorship(row)]);
          toast("Mentoria cadastrada");
        }
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const deleteMentorship = useCallback(
    async (id: string) => {
      try {
        await backend.remove("mentorships", id);
        setMentorships((ms) => ms.filter((m) => m.id !== id));
        toast("Mentoria excluída");
      } catch (e) {
        fail(e);
      }
    },
    [fail, toast],
  );

  const setSetting = useCallback(
    async (key: string, value: string) => {
      const prev = settingsRef.current[key];
      setSettings((s) => ({ ...s, [key]: value }));
      try {
        await backend.setSetting(key, value);
      } catch (e) {
        setSettings((s) => ({ ...s, [key]: prev }));
        fail(e);
        throw e;
      }
    },
    [fail],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready, loadError, user, funnels, leads, tasks, mentorships, settings, reload: load, signIn, signOut, can, canEdit,
      activeFunnelId, setActiveFunnelId, detailId, openLead: setDetailId, closeLead: () => setDetailId(null),
      dialog, setDialog, toasts, toast, dismissToast, confirm,
      saveLead, importLeads, patchLead, moveLeadTo, deleteLead, addNote, snoozeFollowUp, markFollowUpDone, markAbordado,
      saveFunnel, deleteFunnel, saveStages, saveTask, deleteTask, setTaskStatus, saveMentorship, deleteMentorship,
      setSetting, syncToElo, registrarLigacao,
    }),
    [ready, loadError, user, funnels, leads, tasks, mentorships, settings, load, signIn, signOut, can, canEdit, activeFunnelId, setActiveFunnelId, detailId, dialog, toasts, toast, dismissToast, confirm, saveLead, importLeads, patchLead, moveLeadTo, deleteLead, addNote, snoozeFollowUp, markFollowUpDone, markAbordado, saveFunnel, deleteFunnel, saveStages, saveTask, deleteTask, setTaskStatus, saveMentorship, deleteMentorship, setSetting, syncToElo, registrarLigacao],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}
