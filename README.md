# Cart Generator

Cart Generator is a `pnpm` monorepo for turning saved recipes into recipe-based carts and derived shopping carts.

The backend has already crossed the initial scaffold stage. The API now exposes the internal `/api/v1` contract, persists `CartDraft`, `Cart`, and `ShoppingCart` separately, and runs against local Postgres with Prisma migrations. The frontend exists mainly as a thin internal dashboard pointed at the new API surface; the next priority is still backend work.

## What Exists Today

### API

The NestJS API in [apps/api](/C:/Users/akuma/repos/cart-generator/apps/api) currently supports:

- user and admin identities in the database
- real auth endpoints for email/password, Google login, refresh, logout, and `/me`
- `/api/v1/me/preferences` for auth-backed cuisine and tag preferences
- `/api/v1/me/onboarding/complete` for explicit onboarding completion
- a global controlled cuisine catalog exposed at `/api/v1/cuisines`
- hybrid tags with explicit `/api/v1/tags` endpoints
- global system recipes and user-owned recipes
- recipe CRUD for user-owned recipes
- an explicit fork flow for copying a system recipe into a user-owned editable recipe
- persisted `cart-drafts`, `carts`, and `shopping-carts`
- deterministic conversion from recipe selections into recipe-based carts
- deterministic ingredient aggregation and mock retailer matching behind shopping-cart generation
- mock product matching with subtotal estimation
- internal `/api/v1` route families for `recipes`, `recipe-forks`, `cart-drafts`, `carts`, and `shopping-carts`
- internal `/api/v1/tags` for visible system tags and user-owned tags
- Swagger UI at `/docs`
- request tracing via `x-request-id`

### Shared Package

[packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared) contains the current TypeScript domain contracts for:

- recipes
- cuisines
- selection and cart models
- aggregation
- matching
- users

### Database and Infra

The API uses Prisma + PostgreSQL.

- Prisma schema: [apps/api/prisma/schema.prisma](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/schema.prisma)
- Migrations: [apps/api/prisma/migrations](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/migrations)
- Seed data: [apps/api/prisma/seed](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/seed)
- Local Docker stack: [infra/docker/docker-compose.yml](/C:/Users/akuma/repos/cart-generator/infra/docker/docker-compose.yml)

### Documentation

The main architecture and design notes live in:

- [docs/architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md)
- [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md)
- [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md)

Those docs now describe the implemented `v1` direction and the next backend milestones.

## Repository Layout

```text
cart-generator/
|-- apps/
|   |-- api/
|   `-- web/
|-- docs/
|-- infra/
|   `-- docker/
|-- packages/
|   `-- shared/
|-- package.json
|-- pnpm-lock.yaml
`-- pnpm-workspace.yaml
```

## Workspace Commands

Install dependencies:

```bash
pnpm install
```

Run both apps:

```bash
pnpm dev
```

Run one app:

```bash
pnpm dev:api
pnpm dev:web
```

Build the workspace:

```bash
pnpm build
```

Run workspace checks:

```bash
pnpm lint
pnpm test
pnpm typecheck
```

## Local API Setup

Root shortcuts:

```bash
pnpm api:setup
pnpm api:up
pnpm api:reset
```

What they do:

- `pnpm api:setup`
Prepares the local backend without starting the server.
Starts Postgres, generates Prisma client, applies existing migrations, and seeds local data.

- `pnpm api:up`
Starts Postgres if needed and then runs the API in dev mode.

- `pnpm api:reset`
Destructive.
Resets the local API database, reapplies migrations, and reruns seed through Prisma.

Start PostgreSQL:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Apply migrations:

```bash
cd apps/api
pnpm prisma:migrate:dev
```

Seed the database:

```bash
pnpm db:seed
```

Start the API:

```bash
pnpm start:dev
```

Recommended first-time local flow:

```bash
pnpm api:setup
pnpm api:up
```

Useful API commands:

```bash
pnpm build
pnpm test --runInBand
pnpm test:e2e
pnpm test:e2e:ci
pnpm prisma:generate
pnpm prisma:studio
```

Swagger:

- UI: [http://localhost:3001/docs](http://localhost:3001/docs)
- OpenAPI JSON: [http://localhost:3001/docs/openapi.json](http://localhost:3001/docs/openapi.json)

## Current Product Rules

- system recipes are global and immutable
- user-created recipes are private by default
- unauthenticated recipe reads only see global system recipes
- authenticated users see global recipes plus their own recipes
- writes require authentication
- `/api/v1/me` is the authenticated profile boundary
- cuisines are now explicit global resources with `kind`-based curation
- recipe writes now use `cuisine_id`, and recipe reads return both `cuisine_id` and expanded `cuisine`
- tags are now explicit resources with `system` and `user` scope
- recipe writes now use `tag_ids`, and recipe reads return both `tag_ids` and expanded `tags`
- forking a system recipe creates a user-owned editable copy
- duplicate forks of the same source recipe are prevented per user
- `CartDraft` is editable user intent
- `Cart` is the stable recipe-based meal plan snapshot
- `ShoppingCart` is the retailer-facing basket derived from a `Cart`
- aggregation and retailer matching remain deterministic

## Live API Shape

The clean internal `v1` contract is now the implemented direction under `/api/v1`.

Resource families:

- `recipes`
- `recipe-forks`
- `cart-drafts`
- `carts`
- `shopping-carts`

Approved conceptual flow:

```text
Recipe -> CartDraft -> Cart -> ShoppingCart
```

Interpretation:

- `CartDraft` is editable user intent
- `Cart` is the stable recipe-based meal plan snapshot
- `ShoppingCart` is the retailer-facing purchase basket derived from a `Cart`

This separation is intentional:

- `Cart` answers "what do I want to cook?"
- `ShoppingCart` answers "what do I need to buy?"
- retailer integration belongs behind `ShoppingCart`
- real auth and future tags should be built on top of this API shape, not by reshaping it again

## What Changed Recently

- `/api/v1` is now the active internal API contract.
- auth persistence now includes `AuthIdentity` and `RefreshToken`.
- cuisine persistence now includes a global `Cuisine` catalog.
- tags persistence now includes `Tag` and `RecipeTag`.
- `/api/v1/auth/register`, `/login`, `/google`, `/refresh`, `/logout`, `GET /me`, and `PATCH /me` are implemented.
- `/api/v1/cuisines` now exposes the global cuisine catalog.
- `/api/v1/me/preferences` now supports read/replace for user cuisine and system-tag preferences.
- `/api/v1/me/onboarding/complete` now marks onboarding completion independently from preferences.
- `/api/v1/tags` now supports list/create/update/delete.
- `POST /api/v1/recipe-forks` replaced the old save-style route.
- recipes now require `cuisine_id` and return expanded `cuisine` objects.
- `cart-drafts`, `carts`, and `shopping-carts` are separate resources in API, shared models, and database schema.
- Prisma migration `20260319113000_split_cart_and_shopping_cart_v1` materializes the new `Cart`/`ShoppingCart` split.
- Prisma migration `20260319124500_add_cuisine_catalog` materializes the controlled cuisine catalog and recipe relation.
- the web app dashboard in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) now reads the `/api/v1` endpoints and reflects the new model vocabulary.

## Upcoming Work

The highest-signal next steps are in backend, not frontend expansion.

1. Keep retailer integration behind `ShoppingCart` and swap mock matching for a real provider later.
2. Defer recipe variants and AI-assisted adaptation until auth and taxonomy are settled.
3. Add captcha to sensitive auth surfaces after the core auth/client migration is stable.
4. Expand account analytics beyond the first lightweight `/api/v1/me/stats` counters.
5. Harden Google OAuth for production secret management and deploy configuration.

## Current Gaps

- the web app in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) is still a thin internal dashboard, not a full product UI
- the web app now supports email/password plus Google sign-in, but it is still a thin internal dashboard rather than a full product UI
- onboarding now exists as a required first-run flow, and `/account` now exposes profile plus preference editing after setup
- recipe variants and AI-assisted adaptation are not implemented yet
- retailer matching is still mock data, not a real retailer integration

## Practical Reading Guide

If you want the current truth of the system:

1. Read [docs/architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md) for the layered system and the approved `Cart` vs `ShoppingCart` split.
2. Read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for the policy and API-shape decisions.
3. Read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual model vocabulary.
4. Read Swagger at `/docs` for the live implemented `/api/v1` contract.
