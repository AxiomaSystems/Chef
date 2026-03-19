# Cart Generator

Cart Generator is a `pnpm` monorepo for turning saved recipes into structured meal plans and derived shopping carts.

The backend is beyond scaffold stage. The API already supports recipe persistence, user/system ownership rules, deterministic ingredient aggregation, mock retailer matching, cart persistence, Swagger docs, and local Postgres via Docker. The frontend is still mostly unfinished.

## What Exists Today

### API

The NestJS API in [apps/api](/C:/Users/akuma/repos/cart-generator/apps/api) currently supports:

- user and admin identities in the database
- global system recipes and user-owned recipes
- recipe CRUD for user-owned recipes
- an explicit save/fork flow for copying a system recipe into a user-owned editable recipe
- deterministic cart generation from recipe selections
- persisted cart drafts and persisted generated shopping carts
- mock product matching with subtotal estimation
- Swagger UI at `/docs`
- request tracing via `x-request-id`

### Shared Package

[packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared) contains the current TypeScript domain contracts for:

- recipes
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

Those docs intentionally describe both implemented behavior and the approved direction for the next API refactor.

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
- saving a system recipe creates a user-owned fork
- duplicate forks of the same source recipe are prevented per user
- aggregation and retailer matching remain deterministic

## Approved API Direction

The next API refactor should establish a clean internal `v1` contract under `/api/v1`.

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
- real auth and future tags should be built on top of this cleaner API shape, not on the current surface

## Recommended Execution Order

1. Refactor the HTTP surface to the internal `/api/v1` contract.
2. Split the current cart concept into `Cart` and `ShoppingCart` at the API and domain boundary level.
3. Update the web app to consume the new `v1` contract.
4. Replace development header identity with real auth centered on `/me`.
5. Add hybrid tags and controlled cuisine taxonomy.
6. Replace mock matching with a real retailer provider behind the shopping-cart flow.
7. Add recipe variants and AI-assisted adaptation later as a separate layer.

## Current Gaps

- the web app in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) is still not a real product UI
- authentication is still header-based development context, not a real login/session flow
- there is no real account system yet for Google OAuth, email/password, or phone login
- there is no `/me` profile surface yet
- there is no onboarding flow for culinary preferences or dietary interests yet
- `cuisine` is still a free `string`, not a controlled catalog relation
- tags are still `string[]` and not yet modeled as hybrid system/user tags
- recipe variants and AI-assisted adaptation are not implemented yet
- retailer matching is still mock data, not a real retailer integration

## Practical Reading Guide

If you want the current truth of the system:

1. Read [docs/architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md) for the layered system and the approved `Cart` vs `ShoppingCart` split.
2. Read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for the policy and API-shape decisions.
3. Read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual model vocabulary.
4. Read Swagger at `/docs` for the live implemented contract until the `v1` refactor lands.
