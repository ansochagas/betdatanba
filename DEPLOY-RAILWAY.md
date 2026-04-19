# Deploy Railway

Este projeto pode ser publicado em duas etapas:

1. `Piloto de 15 usuarios`
2. `Ambiente profissional`

## Fase 1: Piloto

Objetivo:
- colocar o app online rapido
- validar login, pre-jogo, jogadores, live e checkout
- usar o subdominio publico do Railway

### Deploy agora

1. criar um projeto novo no Railway
2. conectar o repositório
3. provisionar um banco Postgres no mesmo projeto
4. configurar as variáveis do arquivo `.env.railway.example`
5. gerar o domínio público do serviço
6. preencher:
   - `APP_URL`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `INTERNAL_APP_URL`
7. executar no ambiente local, antes do corte:
   - `npm run db:generate:postgres`
   - `npm run db:push:postgres`
   - `RESET_TARGET_DB=true npm run db:migrate:sqlite-to-postgres`
8. no Railway, trocar `DATABASE_URL` para a URL final do Postgres
9. subir o deploy
10. validar `/api/health`

Recomendado:
- plano `Free` ou `Hobby`
- manter `APP_URL` e `NEXTAUTH_URL` apontando para `https://seu-app.up.railway.app`
- se usar SQLite no piloto, monte o arquivo em volume persistente
- usar `POSTGRES_DATABASE_URL` desde ja, se quiser encurtar a migracao depois

Variaveis minimas:
- `APP_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `INTERNAL_APP_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `BILLING_PROVIDER=mercadopago`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `API_BASKETBALL_KEY`
- `BETSAPI_TOKEN`
- `TELEGRAM_BOT_TOKEN` (se for ativar a integracao base do Telegram)

Telegram no piloto:
- a integracao base agora usa `webhook` no proprio app, sem depender de polling em producao
- depois do deploy, rodar:
  - `npm run telegram:webhook:set`
- validar:
  - `npm run telegram:webhook:info`
- endpoint esperado:
  - `APP_URL/api/telegram/webhook`
- `TELEGRAM_WEBHOOK_SECRET` e opcional
  - se vazio, o app deriva um segredo a partir do token do bot

Rotas para validar apos o deploy:
- `/api/health`
- `/login`
- `/dashboard`
- `/api/nba/matches?days=2`
- `/api/nba/team-stats?limit=30`
- `/api/nba/live?force=true`
- `/api/billing/provider`
- `/api/mercadopago/create-checkout-session`
- `/api/webhooks/billing`

Mercado Pago no piloto:
- `back_urls` usam `APP_URL`
- `notification_url` usa `APP_URL/api/webhooks/billing`
- `MERCADOPAGO_WEBHOOK_SECRET` deve estar configurado antes de validar webhook real
- se precisar, sobrescreva com `MERCADOPAGO_WEBHOOK_URL`

## Fase 2: Ambiente profissional

Objetivo:
- trocar o subdominio do Railway por dominio proprio
- sair do setup temporario para um ambiente comercial

Mudancas obrigatorias:
1. subir para plano pago
2. anexar dominio proprio
3. atualizar:
   - `APP_URL`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `INTERNAL_APP_URL` se necessario
4. atualizar no Mercado Pago:
   - `back_urls`
   - `notification_url`

## Banco de dados

Estado atual:
- o piloto online ainda usa `sqlite` via `DATABASE_URL=file:...`
- o projeto agora aceita runtime em `sqlite` ou `postgres` sem trocar codigo
- o provider e detectado automaticamente por:
  - `PRISMA_PROVIDER`, se definido
  - ou pelo formato de `DATABASE_URL`

Recomendacao:
- `piloto`: pode usar SQLite apenas como etapa curta e com volume persistente
- `comercial`: migrar para PostgreSQL antes de vender

Comandos preparados:
- `npm run db:generate`
- `npm run db:generate:all`
- `npm run db:generate:postgres`
- `npm run db:push:postgres`
- `npm run db:migrate:sqlite-to-postgres`

Fluxo sugerido para a migracao:
1. configurar `POSTGRES_DATABASE_URL`
2. rodar `npm run db:generate:all`
3. rodar `npm run db:push:postgres`
4. rodar `RESET_TARGET_DB=true npm run db:migrate:sqlite-to-postgres`
5. no Railway, trocar `DATABASE_URL` para a URL Postgres final
6. opcionalmente definir `PRISMA_PROVIDER=postgres`
7. fazer um deploy controlado
8. validar `/api/health`, login, billing e webhooks

Motivo:
- Postgres reduz risco operacional
- facilita backup, restore e concorrencia
- e o caminho correto para evolucao do produto

## Checklist de subida

1. configurar envs do Railway
2. configurar dominio publico do servico
3. validar `GET /api/health`
4. validar login
5. validar pre-jogo
6. validar analise dos jogadores
7. validar live
8. validar checkout Mercado Pago
9. validar webhook Mercado Pago
10. registrar feedbacks e pontos de observabilidade
11. se Telegram estiver ativo, validar `/settings`, vinculacao de conta e `npm run telegram:webhook:info`
