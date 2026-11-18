-- ════════════════════════════════════════════════════════════════
--  ThiagoCRM · Agenda (diagnósticos, reuniões e sessões)
--  Rode uma vez no SQL Editor do Supabase DO CRM.
--  Só CRIA uma tabela nova: nada do que já existe é tocado e o
--  CRM antigo (index.html) continua funcionando igual.
--  Pode rodar mais de uma vez sem problema.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),

  -- o que é
  titulo        text not null,
  tipo          text not null default 'diagnostico',  -- diagnostico | reuniao | mentoria | ligacao | outro
  status        text not null default 'agendado',     -- agendado | confirmado | realizado | faltou | cancelado

  -- quando
  data          date not null,
  hora          time,                                  -- nulo = dia inteiro
  duracao_min   int  not null default 60,

  -- com quem
  lead_id       uuid references public.leads(id) on delete set null,
  lead_nome     text,                                  -- cópia: o nome continua na agenda mesmo se o lead for excluído
  lead_telefone text,

  -- quem conduz e QUEM MARCOU
  responsavel_id    uuid,
  responsavel_nome  text,
  marcado_por_id    uuid,
  marcado_por_nome  text,
  marcado_em        timestamptz not null default now(),

  -- detalhes
  local         text,                                  -- link da chamada ou endereço
  observacoes   text,
  valor         numeric not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- colunas novas em bancos que já criaram a tabela antes
alter table public.agenda add column if not exists lead_telefone    text;
alter table public.agenda add column if not exists responsavel_id   uuid;
alter table public.agenda add column if not exists responsavel_nome text;
alter table public.agenda add column if not exists marcado_por_id   uuid;
alter table public.agenda add column if not exists marcado_por_nome text;
alter table public.agenda add column if not exists valor            numeric not null default 0;

create index if not exists agenda_data_idx    on public.agenda (data);
create index if not exists agenda_lead_idx    on public.agenda (lead_id);
create index if not exists agenda_status_idx  on public.agenda (status);

-- updated_at automático
create or replace function public.agenda_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists agenda_touch on public.agenda;
create trigger agenda_touch before update on public.agenda
  for each row execute function public.agenda_touch();

-- ── Acesso: mesma regra das outras tabelas do CRM (quem está logado usa) ──
alter table public.agenda enable row level security;

drop policy if exists "agenda leitura" on public.agenda;
create policy "agenda leitura" on public.agenda
  for select to authenticated using (true);

drop policy if exists "agenda escrita" on public.agenda;
create policy "agenda escrita" on public.agenda
  for all to authenticated using (true) with check (true);

-- ── Atualização ao vivo (a tela muda sozinha quando alguém marca algo) ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agenda'
  ) then
    alter publication supabase_realtime add table public.agenda;
  end if;
end $$;
