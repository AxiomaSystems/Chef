# Cart Generator

Cart Generator is a pnpm monorepo for a grocery-cart generation system built around saved recipes, deterministic backend logic, and an eventual AI-assisted adaptation layer.

The repository is still in the scaffold phase. The architecture and model docs are ahead of the implementation.

## Current State

- `apps/api` is a NestJS starter app with a basic health-style endpoint and starter tests.
- `apps/web` is a Next.js starter app with template UI.
- `packages/shared` contains shared TypeScript workspace code, but the domain model is not implemented yet.
- `docs/` describes the planned architecture, decisions, and models.

## Repository Layout

```text
cart-generator/
|-- apps/
|   |-- api/
|   `-- web/
|-- docs/
|   |-- architecture.md
|   |-- decisions.md
|   `-- models.md
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

Run one app at a time:

```bash
pnpm dev:api
pnpm dev:web
```

Build the workspace:

```bash
pnpm build
```

Run lint and tests:

```bash
pnpm lint
pnpm test
pnpm typecheck
```

## App Commands

API:

```bash
cd apps/api
pnpm start:dev
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
```

Web:

```bash
cd apps/web
pnpm dev
pnpm build
```

## What Is Planned

The target product is a layered system that turns selected recipes into a structured cart through:

1. recipe storage
2. recipe selection
3. optional constraint-based adaptation
4. ingredient normalization
5. deterministic aggregation
6. product matching
7. cart and cost estimation

The detailed target architecture lives in:

- [docs/architecture.md](C:/Users/akuma/repos/cart-generator/docs/architecture.md)
- [docs/decisions.md](C:/Users/akuma/repos/cart-generator/docs/decisions.md)
- [docs/models.md](C:/Users/akuma/repos/cart-generator/docs/models.md)

## Known Gaps

- No database or Prisma setup yet
- No recipe CRUD
- No `POST /cart/generate` endpoint yet
- No aggregation or matching pipeline yet
- No Dockerized local infra yet
- No real frontend product flow yet

## Immediate Next Steps

- add shared domain types from the models doc to `packages/shared`
- add Prisma and PostgreSQL
- build `recipe` CRUD in the API
- implement deterministic aggregation
- add a mock product catalog and matching logic
- replace the starter frontend with a minimal recipe and cart flow
