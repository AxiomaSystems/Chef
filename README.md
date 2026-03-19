# Cart Generator

Cart Generator is a `pnpm` monorepo for turning saved recipes into generated grocery carts.

The backend is now beyond scaffold stage. The API already supports recipe persistence, user/system ownership rules, deterministic ingredient aggregation, mock retailer matching, cart persistence, Swagger docs, and local Postgres via Docker. The frontend is still mostly unfinished.

## What Exists Today

### API

The NestJS API in [apps/api](/C:/Users/akuma/repos/cart-generator/apps/api) currently supports:

- user and admin identities in the database
- global system recipes and user-owned recipes
- recipe CRUD for user-owned recipes
- `POST /recipes/:id/save` to fork a global system recipe into an editable user copy
- `GET /recipes/:id/origin` to see the source recipe of a saved fork
- deterministic `POST /cart/generate`
- persisted cart drafts and generated carts
- mock product matching with subtotal estimation
- Swagger UI at `/docs`
- request tracing via `x-request-id`

### Shared Package

[packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared) contains the current TypeScript domain contracts for:

- recipes
- cart requests and responses
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

Those docs are still useful, but the codebase is now the stronger source of truth for implemented behavior.

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

## Recommended Next Steps

1. Build the minimal web flow in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) for recipes, selection, and generated cart results.
2. Replace free `cuisine: string` with a controlled cuisine catalog relation and migration path.
3. Replace `tags: string[]` with a real relational tag model that supports shared system tags plus user-scoped tags.
4. Add user preference models on top of cuisines and tags so onboarding has real taxonomies to write into.
5. Replace dev header identity with a real auth system centered on:
   - Google OAuth
   - email/password
   - phone login later or as a second-phase provider
6. Add account/profile endpoints such as:
   - `GET /me`
   - `PATCH /me`
   - auth routes for login, logout, password reset, and provider linking
7. Add onboarding for culinary preferences, dietary interests, and discovery signals rather than collecting low-value demographic fields.
8. Add recipe variants and AI-assisted adaptation on top of the current deterministic base.
9. Replace mock matching with a real retailer integration.
