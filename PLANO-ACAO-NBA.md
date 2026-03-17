# PLANO-ACAO-NBA

## 1) Contexto do negocio
- Produto atual: plataforma de analise para CS (pre-live, gold list, live, previsoes).
- Nova frente: basquete (foco inicial NBA) para mercado Brasil.
- Objetivo de curto prazo: lancar MVP de pre-jogo com monetizacao.

## 2) Decisoes ja tomadas
- Regiao foco inicial: Brasil.
- Estrategia comercial: planos separados (CS e Basquete).
- Combo CS + Basquete: tratado manualmente no inicio.
- API inicial para NBA: api-basketball (plano gratuito no comeco).
- Ordem de produto: primeiro pre-jogo, live em etapa posterior.

## 3) O que foi feito nesta pasta
- Pasta criada: `nba-intel`.
- Base copiada de `csgo-intel` com apenas estrutura essencial:
  - `src/`, `prisma/`, `public/`
  - configs (`package.json`, `tsconfig.json`, `next.config.js`, etc.)
- Nao foram copiados itens pesados/sensiveis:
  - `node_modules/`, `.next/`, `.git/`, `.env.local`, `.env`

## 4) Objetivo da nova conversa com Codex
Executar a migracao para um produto NBA pre-jogo sem quebrar o core (auth, billing, cache, dashboard base), removendo acoplamentos de CS gradualmente.

## 5) Estrategia tecnica recomendada
- Manter um `core` reutilizavel (auth, usuarios, assinatura, cache, observabilidade).
- Isolar dominio por esporte em modulos:
  - `src/modules/csgo/*`
  - `src/modules/nba/*`
- Criar contratos comuns:
  - `Match`, `Team`, `Odds`, `Market`, `TeamStats`, `Insight`
- Adapters por provedor:
  - `src/modules/nba/adapters/api-basketball/*`

## 6) Plano por sprint

### Sprint 0 - Saneamento da base (1-2 dias)
1. Renomear textos/marcas de CS para neutro no app shell.
2. Criar flag de esporte ativo (`SPORT=nba` no ambiente).
3. Limpar endpoints e servicos que quebram sem API de CS.
4. Garantir app sobe com dados mock NBA.

Criterios de aceite:
- Login funciona.
- Dashboard abre sem erro.
- Ferramenta principal mostra lista mock de jogos NBA.

### Sprint 1 - Ingestao NBA pre-jogo (2-4 dias)
1. Integrar `api-basketball` para jogos do dia/amanha.
2. Normalizar payload para `NbaMatch` interno.
3. Cache de 15-30 min para agenda/odds pre-jogo.
4. Endpoint `GET /api/nba/matches` com fallback seguro.

Criterios de aceite:
- API responde em < 1.5s com cache quente.
- Tratamento de erro amigavel quando cota acabar.

### Sprint 2 - Analise pre-jogo (3-5 dias)
1. Definir score simples de oportunidade (MVP):
   - forma recente,
   - home/away split,
   - descanso,
   - variacao de odds (se disponivel).
2. Criar `Gold List NBA` com ranking e justificativa.
3. Exibir confianca (baixa/media/alta) com explicacao curta.

Criterios de aceite:
- Gold List exibe top oportunidades do dia.
- Cada item mostra ao menos 3 sinais de suporte.

### Sprint 3 - Produto e monetizacao (2-3 dias)
1. Plano separado de basquete no billing.
2. Controle de acesso por plano (`hasNbaAccess`).
3. Tela de upgrade para basquete.
4. Fluxo de combo manual (backoffice simples no inicio).

Criterios de aceite:
- Usuario sem plano NBA ve bloqueio correto.
- Usuario com plano NBA acessa ferramentas sem friccao.

### Sprint 4 - Preparacao para live (pos-MVP)
1. Escolher provider para live com custo controlado.
2. Definir polling/websocket e limites de custo.
3. Implementar somente placar + estado de jogo no inicio.

## 7) Riscos e mitigacoes
- Risco: limite de API gratis.
  - Mitigacao: cache agressivo + fallback + limite de features no MVP.
- Risco: acoplamento legado de CS.
  - Mitigacao: refatorar por modulo, nao duplicar gambiarra.
- Risco: custo operacional subir cedo.
  - Mitigacao: pre-jogo primeiro, live apenas com unidade economica validada.

## 8) Prompt para iniciar nova conversa
Cole exatamente isto no novo chat:

"Contexto: este projeto e a nova frente NBA do meu negocio (foco Brasil). Quero executar o arquivo `PLANO-ACAO-NBA.md` sprint por sprint. Ja decidimos: planos separados (CS e basquete), combo manual no inicio, API inicial `api-basketball`, e prioridade total em pre-jogo. Comece pela Sprint 0 e implemente tudo com verificacao tecnica no final." 

## 9) Definicoes praticas para Sprint 0
- Criar arquivo `.env.local` minimo:
  - `NEXTAUTH_SECRET=...`
  - `NEXTAUTH_URL=http://localhost:3000`
  - `DATABASE_URL=file:./dev.db`
  - `SPORT=nba`
  - `API_BASKETBALL_KEY=...`
- Rodar:
  - `npm install`
  - `npm run dev`

## 10) Meta de entrega
- MVP NBA pre-jogo em producao inicial, com plano pago separado e operacao estavel.
