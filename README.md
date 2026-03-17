# betdatanba

Plataforma NBA focada em pre-jogo para o mercado Brasil.

## Stack

- Next.js 14
- TypeScript
- Prisma
- NextAuth
- Mercado Pago / Stripe
- API-Basketball / BetsAPI

## Ambientes

- desenvolvimento local: `.env.local`
- deploy piloto Railway: `.env.railway.example`

## Comandos

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
npm run start
```

## Banco

Estado atual:
- desenvolvimento local com SQLite

Preparado para migracao:
- schema Postgres em `prisma/schema.postgres.prisma`
- migracao em `scripts/migrate-sqlite-to-postgres.js`

Comandos:

```bash
npm run db:generate:postgres
npm run db:push:postgres
npm run db:migrate:sqlite-to-postgres
```

## Deploy

Guia de deploy no Railway:

- `DEPLOY-RAILWAY.md`

Healthcheck:

- `/api/health`
