-- ─────────────────────────────────────────────────────────────────────────────
-- Kanban por mês (v2.10)
--
-- Acrescenta UMA coluna em public.leads: mes_ref, o "mês de trabalho" do lead.
-- Não apaga nem altera nada que já existe — pode rodar de novo sem medo.
--
-- Por que uma coluna própria, e não a data de entrada: um lead que entrou em
-- setembro e ainda está em negociação precisa continuar aparecendo no quadro de
-- novembro. Com mes_ref a equipe decide em que mês ele está sendo trabalhado, e
-- o CRM oferece puxar os que ficaram para trás.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads add column if not exists mes_ref text;

-- Leads que já existem começam no mês em que entraram.
update public.leads
   set mes_ref = to_char(coalesce(date, created_at::date, current_date), 'YYYY-MM')
 where mes_ref is null;

-- Daqui para frente, lead criado sem mês cai no mês da própria data.
alter table public.leads
  alter column mes_ref set default to_char(current_date, 'YYYY-MM');

-- Formato fixo YYYY-MM: é o que o CRM espera ao filtrar e ordenar.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_mes_ref_formato') then
    alter table public.leads
      add constraint leads_mes_ref_formato
      check (mes_ref is null or mes_ref ~ '^\d{4}-(0[1-9]|1[0-2])$');
  end if;
end $$;

-- O Kanban filtra por funil + mês; os relatórios varrem o mês inteiro.
create index if not exists leads_mes_ref_idx        on public.leads (mes_ref);
create index if not exists leads_funil_mes_ref_idx  on public.leads (funnel_id, mes_ref);

-- Confira depois de rodar: deve listar os meses com a contagem de cada um.
-- select mes_ref, count(*) from public.leads group by 1 order by 1 desc;
