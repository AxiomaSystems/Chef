# API

NestJS backend for Cart Generator.

This app is the most complete part of the repository right now. It already supports persisted recipes, global vs user ownership, forked recipe copies, deterministic cart generation, draft/history persistence, mock product matching, Swagger docs, and local Postgres via Prisma.

## Current Capabilities

- user and admin records in the database
- global system recipes plus private user-owned recipes
- recipe CRUD for user-owned recipes
- `POST /recipes/:id/save` to fork a system recipe into a user-owned editable copy
- `GET /recipes/:id/origin` to retrieve the source recipe of a fork
- deterministic `POST /cart/generate`
- persisted cart drafts
- persisted generated carts and generated cart history
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

Swagger already includes:

- request examples for mutable endpoints
- success and error response examples
- `x-user-id` header examples
- `401`, `403`, and `404` documentation where relevant

## Current Access Rules

- system recipes are global and immutable
- user-created recipes are private by default
- unauthenticated `GET /recipes` and `GET /recipes/:id` only expose global system recipes
- writes require authentication
- authenticated users can see global recipes plus their own recipes
- saving a system recipe creates or reuses a single fork per user
- generated carts and drafts are user-scoped

## Development Headers

The API currently uses a development-only actor header:

```text
x-user-id: postigodev@cart-generator.local
```

`x-user-id` can resolve either:

- a real user id
- or a seeded user email

If `x-user-id` is omitted:

- recipe reads behave as unauthenticated access
- mutable endpoints return `401 Authentication required`

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

Recipes:

- `POST /recipes`
- `GET /recipes`
- `GET /recipes/:id`
- `GET /recipes/:id/origin`
- `PATCH /recipes/:id`
- `POST /recipes/:id/save`
- `DELETE /recipes/:id`

Cart:

- `POST /cart/generate`
- `POST /cart/drafts`
- `GET /cart/drafts`
- `GET /cart/drafts/:id`
- `GET /cart/generated`
- `GET /cart/generated/history`
- `GET /cart/generated/:id`

## Example Requests

List visible recipes:

```bash
curl -H "x-user-id: postigodev@cart-generator.local" http://localhost:3001/recipes
```

Create a recipe:

```bash
curl -X POST http://localhost:3001/recipes ^
  -H "Content-Type: application/json" ^
  -H "x-user-id: postigodev@cart-generator.local" ^
  -d "{\"name\":\"Arroz con pollo casero\",\"cuisine\":\"Peruvian\",\"description\":\"Comforting chicken and rice dish.\",\"servings\":4,\"ingredients\":[{\"canonical_ingredient\":\"rice\",\"amount\":2,\"unit\":\"cup\"},{\"canonical_ingredient\":\"chicken thigh\",\"amount\":800,\"unit\":\"g\"}],\"steps\":[{\"step\":1,\"what_to_do\":\"Brown the chicken thighs.\"}],\"tags\":[\"dinner\"]}"
```

Save a system recipe into the current user's library:

```bash
curl -X POST http://localhost:3001/recipes/RECIPE_ID/save ^
  -H "x-user-id: postigodev@cart-generator.local"
```

Get the origin of a saved fork:

```bash
curl -H "x-user-id: postigodev@cart-generator.local" http://localhost:3001/recipes/RECIPE_ID/origin
```

Generate a cart:

```bash
curl -X POST http://localhost:3001/cart/generate ^
  -H "Content-Type: application/json" ^
  -H "x-user-id: postigodev@cart-generator.local" ^
  -H "x-request-id: req-local-123" ^
  -d "{\"selections\":[{\"recipe_id\":\"recipe-1\",\"recipe_type\":\"base\",\"quantity\":2,\"servings_override\":4}],\"retailer\":\"walmart\"}"
```

Get generated cart history:

```bash
curl -H "x-user-id: postigodev@cart-generator.local" http://localhost:3001/cart/generated/history
```

## Known Gaps

- auth is still development header context, not a real login/session flow
- tags are still `string[]`, not hybrid shared/private tags yet
- recipe variants and AI-assisted adaptation are still pending
- matching is still mock retailer logic, not a production retailer integration
