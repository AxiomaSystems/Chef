# API

NestJS backend for Cart Generator.

This app is the most complete part of the repository right now. It already supports real auth, `/api/v1`, persisted recipes, user ownership, onboarding-aware preferences, carts/shopping carts, Swagger docs, and local Postgres via Prisma.

## Current Capabilities

- user and admin records in the database
- global system recipes plus private user-owned recipes
- recipe CRUD for user-owned recipes
- real auth endpoints for email/password, Google login, refresh, logout, and `/me`
- `/api/v1/me/preferences` and `/api/v1/me/onboarding/complete`
- `POST /api/v1/recipe-forks` and `GET /api/v1/recipes/:id/origin`
- persisted cart drafts, carts, and shopping carts
- mock retailer matching with subtotal estimation
- request tracing with `x-request-id`
- Swagger/OpenAPI docs

## API Base URL

By default the API runs at:

```text
http://localhost:3001
```

## Documentation

Swagger UI:

```text
http://localhost:3001/docs
```

OpenAPI JSON:

```text
http://localhost:3001/docs/openapi.json
```

Swagger already includes request examples plus `401`, `403`, and `404` documentation where relevant.

## Current Access Rules

- system recipes are global and immutable
- user-created recipes are private by default
- unauthenticated `GET /recipes` and `GET /recipes/:id` only expose global system recipes
- writes require authentication
- authenticated users can see global recipes plus their own recipes
- saving a system recipe creates or reuses a single fork per user
- generated carts and drafts are user-scoped

Every response also includes:

```text
x-request-id: <generated-or-forwarded-id>
```

You can pass your own request id:

```text
x-request-id: req-local-123
```

## Local Setup

From the repo root, start PostgreSQL:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Then from [apps/api](/C:/Users/akuma/repos/cart-generator/apps/api):

```bash
pnpm prisma:migrate:dev
pnpm db:seed
pnpm start:dev
```

Prisma now uses [prisma.config.ts](/C:/Users/akuma/repos/cart-generator/apps/api/prisma.config.ts), so the old deprecated `package.json#prisma` config is gone.

## Useful Commands

```bash
pnpm start:dev
pnpm build
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:studio
pnpm db:seed
pnpm test --runInBand
pnpm test:e2e
pnpm test:e2e:ci
```

Use `pnpm test:e2e:ci` when you want the stable in-band e2e run.

## Main Endpoints

Auth and profile:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/me/preferences`
- `PUT /api/v1/me/preferences`
- `POST /api/v1/me/onboarding/complete`

Core resources:

- `GET /api/v1/cuisines`
- `GET /api/v1/tags`
- `POST /api/v1/tags`
- `PATCH /api/v1/tags/:id`
- `DELETE /api/v1/tags/:id`
- `GET /api/v1/recipes`
- `POST /api/v1/recipes`
- `GET /api/v1/recipes/:id`
- `GET /api/v1/recipes/:id/origin`
- `PATCH /api/v1/recipes/:id`
- `DELETE /api/v1/recipes/:id`
- `POST /api/v1/recipe-forks`
- `GET /api/v1/cart-drafts`
- `POST /api/v1/cart-drafts`
- `GET /api/v1/cart-drafts/:id`
- `PATCH /api/v1/cart-drafts/:id`
- `DELETE /api/v1/cart-drafts/:id`
- `GET /api/v1/carts`
- `POST /api/v1/carts`
- `GET /api/v1/carts/:id`
- `PATCH /api/v1/carts/:id`
- `DELETE /api/v1/carts/:id`
- `POST /api/v1/carts/:cartId/shopping-carts`
- `GET /api/v1/shopping-carts`
- `GET /api/v1/shopping-carts/:id`
- `GET /api/v1/shopping-carts/history`

## Example Requests

Register:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"name\":\"Example User\",\"password\":\"s3cure-passphrase\"}"
```

Read profile with bearer auth:

```bash
curl http://localhost:3001/api/v1/me ^
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Known Gaps

- web client migration is still incomplete outside the internal dashboard
- recipe variants and AI-assisted adaptation are still pending
- matching is still mock retailer logic, not a production retailer integration
