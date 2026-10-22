-- ThiagoCRM v2.6 · leads ao vivo
-- Faz a tela do CRM mudar sozinha quando o Elo atualiza a esteira de um lead.
-- Pode rodar mais de uma vez.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
