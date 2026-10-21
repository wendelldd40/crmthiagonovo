# ThiagoCRM 2.0

CRM da Thiago Alemão Gestão Empresarial Veterinária, reescrito em **Next.js 16 + React 19 + Tailwind 4**, com a mesma base técnica do Elo (Radix, Motion, dnd-kit, Lucide).

**Usa o mesmo banco Supabase do CRM antigo, sem nenhuma migração.** As tabelas `leads`, `funnels`, `tasks`, `mentorships`, `settings`, `user_profiles` e a view `users_with_email` são lidas e gravadas exatamente como antes. Dá para rodar o antigo e o novo ao mesmo tempo durante a transição.

## Rodar no computador

```bash
npm install
npm run dev        # http://localhost:3000
```

Sem `.env.local`, abre em **modo demonstração**: dados fictícios salvos só no navegador e envio ao Elo simulado. Serve para testar sem mexer nos dados reais.

Para usar os dados reais, copie `.env.example` para `.env.local` e preencha:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | O mesmo do CRM antigo: `https://lyrzvwwjrfilzytymvnq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A mesma chave pública que estava no `index.html` antigo |
| `ELO_API_URL` | Endereço do Elo na Vercel, sem barra no final |
| `ELO_API_KEY` | Chave criada no Elo em **Integrador → API** (começa com `elo_`) |
| `ELO_WEBHOOK_SECRET` | Segredo do webhook criado no Elo (Integrador → Webhooks) para a esteira |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase do CRM, Settings → API. Só servidor: grava a esteira que chega do Elo |

`ELO_API_KEY`, `ELO_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` **não** têm `NEXT_PUBLIC_` de propósito: ficam só no servidor.

## Colocar no ar (Vercel)

1. Suba esta pasta para um repositório no GitHub (pode substituir o conteúdo do `CRM-THIAGO-ALEMAO`).
2. Na Vercel: **Add New → Project**, importe o repositório. Framework: Next.js (detecta sozinho).
3. Em **Environment Variables**, cadastre as 4 variáveis acima.
4. Deploy. Se o CRM antigo estava no GitHub Pages, ele continua funcionando no endereço antigo até você desligar.

O CRM deixou de ser um HTML estático porque o envio ao Elo precisa de um servidor para guardar a chave. Se a chave ficasse no navegador, qualquer pessoa com acesso à página conseguiria criar contatos e disparar mensagens pelo número do Thiago.

## O que tem

| Tela | O que faz |
|---|---|
| **Painel** | Abre com quem precisa ser contatado agora (atrasados, marcados para hoje, parados na etapa). Indicadores, Instagram DM, canais, qualidade do lead, funis, origens, leads novos por semana |
| **Kanban** | Arrastar e soltar com dnd-kit (mouse, toque e teclado). No celular, segure o cartão antes de arrastar. Filtro por funil, alertas de follow-up no cartão, soma de valor por etapa |
| **Leads** | Tabela com busca e filtros (funil, origem, perfil, Elo), seleção em lote, exportação CSV, envio em lote ao Elo |
| **Painel do lead** | Abre ao clicar em qualquer lead. Barra de etapas clicável (muda de etapa com um clique), WhatsApp, editar, mover, enviar ao Elo, histórico e notas |
| **Funis** | Cartões com fechamento, pipeline e distribuição por etapa. Editor de etapas com arrastar para reordenar |
| **Relatórios** | Entrada por mês (12 meses), desempenho por funil e por origem. Alterna entre todos os leads e sem planilha |
| **Abordagem** | Script por perfil (gestor ou autônomo), recência e gênero, com link direto do WhatsApp. O script da equipe agora é **salvo no banco** (no antigo, sumia ao recarregar) |
| **Estagiário** | Tarefas por prioridade e prazo, follow-ups, próximos contatos, convertidos e recados para o Thiago |
| **Thiago pessoal** | Carga horária, projeção de receita de 12 meses, mentorias, próximas sessões, vendas por perfil |
| **Marketing** | Funil Instagram → abordagem → cliente, leads por mês, checklist semanal e ferramentas |
| **Integração Elo** | Estado da conexão, envio em lote, envio automático e como cada campo chega no Elo |
| **Usuários** | Perfis de acesso (admin, dev, estagiário, marketing) e tabela do que cada perfil vê |

Extras: busca global com **Ctrl K** (ou Cmd K), tema claro e escuro, menu inferior no celular.

## Integração com o Elo

O CRM chama `POST /api/v1/contatos` do Elo, que **cria ou atualiza** o contato pelo telefone. Não precisou mudar nada no Elo.

- Telefone vira formato `55` + DDD + número. Número com `+` na frente é tratado como estrangeiro e mantido.
- Lead sem telefone válido não vai (o Elo identifica o contato pelo número). A tela mostra quem ficou de fora e por quê.
- Etiquetas enviadas: `CRM`, nome do funil, origem, Gestor ou Autônomo, `Cliente` (se convertido) e qualquer etiqueta extra digitada.
- Campos enviados: `crm_id`, `funil`, `etapa`, `origem`, `perfil`, `empresa`, `instagram`, `valor_estimado`, `proximo_contato`, `veterinario`, `entrada_crm`, `cliente`.
- Lead enviado ganha a tag `elo` no CRM e um registro no histórico.
- **Envio automático** (Integração Elo → ligar): todo lead com WhatsApp que for criado, editado ou mudar de etapa é reenviado, e o campo `etapa` no Elo acompanha o Kanban.

**Importar não manda mensagem a ninguém.** No Elo, a automação "etiqueta adicionada" só dispara para contatos que já têm conversa aberta, e a transmissão pelo número de QR Code só vai para quem já conversou com vocês. O primeiro contato com lead frio continua individual (tela Abordagem) ou por modelo aprovado na API oficial da Meta.

Segurança da rota `/api/elo/sync`: confere o login do Supabase de quem chamou, bloqueia o perfil marketing, revalida telefone, nomes de campo e tamanhos antes de repassar, e aceita no máximo 50 contatos por lote.

### Esteira de contatos (Elo → CRM)

O Elo conta os contatos (1 por dia com mensagem ou ligação da equipe) e avisa o CRM pelo webhook `/api/elo/webhook`. Para cada aviso, o CRM:
- atualiza o selo **3/12** no cartão do Kanban, na tabela de leads e a seção **Esteira no Elo** do painel do lead;
- coloca o **próximo contato** da cadência no follow-up do lead (entra no "Para contatar agora" do Painel);
- registra no histórico ("2º contato pelo WhatsApp (áudio) · Lead frio 2/12", respostas, ligações, conclusão);
- **move a etapa** quando o funil tem etapas com número de contato (`1º contato`, `2º contato`…, também `Contato 3`, `Segundo contato`, `4ª tentativa`). Só anda para frente e nunca mexe em lead convertido.

O lead é encontrado pelo `crm_id` (quando foi enviado pelo CRM) ou pelo telefone. Avisos repetidos não duplicam o histórico.

**Ativar:**
1. No Supabase **do CRM**, rode `supabase/esteira-elo.sql` (só adiciona colunas `elo_*` em `leads`; o CRM antigo continua funcionando).
2. Na Vercel do CRM, cadastre `SUPABASE_SERVICE_ROLE_KEY` (do Supabase do CRM) e `ELO_WEBHOOK_SECRET` (o segredo do webhook criado no Elo).
3. No Elo: Integrador → Webhooks → URL `https://SEU-CRM/api/elo/webhook`, evento **Esteira de contatos atualizada**.

Ao enviar leads ao Elo dá para escolher a **cadência** (e se a contagem começa do zero). Em Integração Elo dá para definir a cadência do envio automático. O botão **Registrar ligação** no painel do lead registra a ligação no Elo, que devolve a contagem atualizada.

**Ainda não feito:** criar lead novo no CRM quando um desconhecido chama no WhatsApp. Hoje o aviso de um contato que não existe no CRM é ignorado.

### Lead que nasce no Elo (v2.2)

Quando o primeiro contato é feito pelo Elo (Iniciar conversa → Número novo, escolhendo funil e etapa), o webhook `/api/elo/webhook` não acha o lead e o **cria** no funil e na etapa marcados, com origem WhatsApp. Depois devolve o id do lead ao Elo. Sem funil marcado no Elo, nada é criado.

O Elo lista os funis por `GET /api/elo/funis`, assinado com o mesmo `ELO_WEBHOOK_SECRET` (cabeçalhos `X-Elo-Timestamp` e `X-Elo-Signature`, validade de 5 minutos).

O lead é achado pelo `crm_id` e, se não houver, pelo telefone **com ou sem o nono dígito**.

## Importar leads (v2.3)

Menu **Importar leads** (admin, dev e estagiário):

- **Google Maps**: cidade ou região + tipos (clínicas, hospitais 24h, pet shops, ou outro termo filtrado para negócios veterinários/pet). Mostra telefone (celular ou fixo), avaliação, site e link do Maps, e marca quem já está no CRM (telefone com ou sem o nono dígito, ou mesmo nome). Até 60 resultados por tipo e região ("Carregar mais"). Precisa de `GOOGLE_PLACES_API_KEY` na Vercel.
- **Planilha**: `.xlsx` ou `.csv` (o modelo é baixado na própria tela). Reconhece as colunas pelo cabeçalho, deixa trocar, e mostra linha a linha o que entra e o que fica de fora (sem nome, telefone inválido, repetido na planilha, já no CRM). Até 3.000 linhas por arquivo.

Nos dois casos você escolhe funil, etapa e etiquetas. "Lista de prospecção" grava a etiqueta `planilha`: o lead fica fora das métricas do Painel e entra na Abordagem, como as planilhas antigas. Com o envio automático ao Elo ligado, os importados com WhatsApp vão para o Elo na mesma hora.

### Chave do Google (uma vez)
1. console.cloud.google.com → crie um projeto → **Faturamento**: vincule um cartão.
2. **APIs e serviços → Biblioteca → Places API (New) → Ativar**.
3. **Credenciais → Criar credenciais → Chave de API**. Em "Restrições de API", deixe só a Places API (New).
4. Na Vercel do CRM: `GOOGLE_PLACES_API_KEY` = a chave (tipo Secret) → Redeploy.

Custo (tabela da Google em out/2026): cada busca de até 20 resultados com telefone é cobrada como *Text Search Enterprise*: 1.000 buscas grátis por mês, depois US$ 35 a cada 1.000. Uma busca de 3 tipos numa cidade, com "Carregar mais" até o fim, gasta até 9 buscas.

### Nova marca (v2.5)

- Logo Thiago Alemão (coruja-pena dourada sobre azul-marinho) no menu, na abertura e no login; ícone da aba trocado. Arquivos em `src/assets/marca/`.

### Leads do Instagram (v2.4)

O webhook do Elo também cria lead para quem chegou pelo Instagram, só com o @ (sem telefone), com origem **IG Comentário** ou **IG Seguidor**. O lead é achado pelo `crm_id`, pelo telefone (com ou sem o 9) ou pelo @. Quando a pessoa passa o WhatsApp no Elo, o lead ganha o telefone (e o histórico registra).

## Correções em relação ao CRM antigo

- **Data de hoje em UTC:** depois das 21h o CRM antigo já considerava o dia seguinte (follow-ups "atrasados" antes da hora). Agora usa o horário local.
- **Filtro de período do Dashboard não fazia nada:** calculava os leads do período e não usava. Agora os números respeitam 7, 30, 90 dias ou tudo.
- **Link do WhatsApp na Abordagem** usava o número cru. Sem o 55 na frente, o `wa.me` abria o contato errado. Agora normaliza.
- **Editar etapas pelo Kanban** deixava leads apontando para etapas apagadas (sumiam do quadro). Agora voltam para a primeira etapa.
- **Término da mentoria** às vezes somava N semanas em vez de N meses.
- **Script global da Abordagem** se perdia ao recarregar a página. Agora fica em `settings`.
- Funções duplicadas no HTML antigo (a segunda definição sobrescrevia a primeira) foram unificadas mantendo o comportamento que estava valendo.

## Estrutura

```
src/app/(app)/        telas (uma pasta por rota)
src/app/api/elo/      rotas do servidor que falam com o Elo
src/app/login/        login
src/components/crm/   painel do lead, formulários, tabela, follow-ups, envio ao Elo
src/components/shell/ menu, busca global, tema, avisos
src/components/ui/    botões, campos, modais, chips
src/lib/              tipos, regras de negócio (domain.ts), estado (store.tsx), mapeamento do banco
src/lib/api/          Supabase real e modo demonstração
src/server/           autenticação e cliente do Elo (só servidor)
```
