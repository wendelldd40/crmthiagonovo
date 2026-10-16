"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { backend, useCRM } from "@/lib/store";
import { ROLE_COLOR, ROLE_LABEL, ROLE_PAGES } from "@/lib/constants";
import type { Role, UserRow } from "@/lib/types";
import { plural } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Notice } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { NAV } from "@/components/shell/nav";

function UserLine({ u, me, onChanged }: { u: UserRow; me: boolean; onChanged: () => void }) {
  const { toast } = useCRM();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(u.name);
  const [busy, setBusy] = useState(false);

  async function update(patch: Partial<UserRow>, msg: string) {
    setBusy(true);
    try {
      await backend.updateUser(u.id, patch);
      toast(msg);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao salvar", "error");
    }
    setBusy(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${ROLE_COLOR[u.role]}, color-mix(in oklab, ${ROLE_COLOR[u.role]} 55%, #051528))` }}>
        {u.avatar || u.name[0]?.toUpperCase()}
      </span>
      <div className="min-w-[180px] flex-1">
        {editing ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && name !== u.name) void update({ name: name.trim(), avatar: name.trim()[0].toUpperCase() }, "Nome atualizado").then(() => setEditing(false));
              else setEditing(false);
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-56" />
            <Button type="submit" size="icon-xs" aria-label="Salvar nome"><Check /></Button>
            <Button size="icon-xs" variant="ghost" onClick={() => { setEditing(false); setName(u.name); }} aria-label="Cancelar"><X /></Button>
          </form>
        ) : (
          <p className="flex items-center gap-1.5 text-[14.5px] font-semibold text-ink">
            {u.name} {me && <span className="text-[12px] font-normal text-ink-3">(você)</span>}
            {!me && <button onClick={() => setEditing(true)} className="rounded-md p-1 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Editar nome"><Pencil className="size-3.5" /></button>}
          </p>
        )}
        <p className="text-[12.5px] text-ink-3">{u.email}</p>
      </div>
      {busy && <Loader2 className="size-4 animate-spin text-ink-3" />}
      <Select value={u.role} disabled={me || busy} onChange={(e) => void update({ role: e.target.value as Role }, `Perfil alterado para ${ROLE_LABEL[e.target.value as Role]}`)} className="w-40" title={me ? "Você não pode alterar o próprio perfil" : undefined}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </Select>
    </li>
  );
}

export default function UsuariosPage() {
  const { user } = useCRM();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    backend
      .listUsers()
      .then((u) => alive && setUsers(u))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "Erro ao carregar"));
    return () => {
      alive = false;
    };
  }, [tick]);

  return (
    <>
      <PageHeader title="Usuários" subtitle="Quem acessa o CRM e o que cada perfil pode ver" />
      <PageBody className="space-y-5">
        <Card className="overflow-hidden">
          <CardHead title="Contas" subtitle={users ? plural(users.length, "conta", "contas") : "Carregando"} />
          {err && <div className="px-5 pb-4"><Notice tone="coral">{err}</Notice></div>}
          {!users && !err && <div className="space-y-2 px-5 pb-5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>}
          {users && <ul className="divide-y divide-line border-t border-line">{users.map((u) => <UserLine key={u.id} u={u} me={u.id === user?.id} onChanged={load} />)}</ul>}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="O que cada perfil acessa" />
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-ink-3"><th className="py-1.5 font-semibold">Área</th>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <th key={r} className="py-1.5 text-center font-semibold" style={{ color: ROLE_COLOR[r] }}>{ROLE_LABEL[r]}</th>)}</tr>
                </thead>
                <tbody>
                  {NAV.map((n) => (
                    <tr key={n.key} className="border-t border-line">
                      <td className="py-1.5 text-ink-2">{n.label}</td>
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <td key={r} className="py-1.5 text-center">{ROLE_PAGES[r].includes(n.key) ? <Check className="mx-auto size-4 text-ok" /> : <span className="text-ink-3">·</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[12.5px] text-ink-3">Marketing só visualiza: não cria, edita nem exclui.</p>
            </div>
          </Card>
          <Card>
            <CardHead title="Como adicionar alguém" />
            <ol className="space-y-2.5 px-5 pb-5 text-[14px] text-ink-2">
              {["No Supabase, abra Authentication, depois Users, e clique em Invite user.", "Digite o e-mail da pessoa e envie o convite.", "Ela recebe um e-mail para criar a senha.", "Depois do primeiro acesso, ela aparece aqui. Escolha o perfil dela na lista."].map((s, i) => (
                <li key={i} className="flex gap-3"><span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-strong">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
