-- ════════════════════════════════════════════════════════════════
--  ThiagoCRM · Esteira do Elo
--  Rode uma vez no SQL Editor do Supabase DO CRM (não do Elo).
--  Só ADICIONA colunas. O CRM antigo (index.html) continua funcionando:
--  ele ignora estas colunas e não as apaga ao salvar.
-- ════════════════════════════════════════════════════════════════

alter table public.leads add column if not exists elo_contatos        int  not null default 0;  -- dias com contato nosso
alter table public.leads add column if not exists elo_total           int;                       -- total da cadência
alter table public.leads add column if not exists elo_cadencia        text;                      -- nome da cadência no Elo
alter table public.leads add column if not exists elo_ultimo_contato  date;
alter table public.leads add column if not exists elo_ultimo_tipo     text;                      -- ex.: "ligacao,texto"
alter table public.leads add column if not exists elo_respostas       int  not null default 0;   -- dias em que o lead respondeu
alter table public.leads add column if not exists elo_ultima_resposta date;
alter table public.leads add column if not exists elo_status          text;                      -- ativa | pausada | concluida | sem
alter table public.leads add column if not exists elo_atualizado_em   timestamptz;
