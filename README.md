# Backend Central - Redesociales IA

Backend de negocio en NestJS + Prisma + PostgreSQL para clientes, cuentas IG, posts, comentarios, analitica y metricas.

## Requisitos
- Node.js 20+
- PostgreSQL 15+
- Servicio IA corriendo en `http://localhost:5000` (por defecto)

## Variables de entorno
Copia `.env.example` a `.env` y ajusta valores:

- `PORT`
- `DATABASE_URL`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `IA_BASE_URL`
- `APP_ENCRYPTION_KEY`
- `SYNC_CRON`
- `FRONTEND_ORIGIN`

## Instalacion
```bash
npm install
```

## Base de datos
```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
```

## Desarrollo
```bash
npm run start:dev
```

API base: `http://localhost:4000/v1`

## Endpoints principales
- `GET /v1/health`
- `GET /v1/dashboard`
- `GET /v1/clients`
- `POST /v1/clients`
- `GET /v1/clients/:clientId`
- `PATCH /v1/clients/:clientId`
- `GET /v1/clients/:clientId/summary`
- `GET /v1/clients/:clientId/accounts`
- `POST /v1/clients/:clientId/accounts/instagram/oauth-url`
- `GET /v1/integrations/meta/callback`
- `POST /v1/clients/:clientId/accounts/:accountId/sync`
- `GET /v1/clients/:clientId/posts`
- `GET /v1/clients/:clientId/posts/:postId`
- `GET /v1/posts/:postId/comments`
- `GET /v1/posts/:postId/comments/analysis`
- `POST /v1/posts/:postId/comments/analyze`
- `GET /v1/clients/:clientId/metrics`

## Scripts
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run db:seed`
