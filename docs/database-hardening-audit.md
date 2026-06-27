# Database Hardening Audit

This note summarizes the Postgres/Supabase hardening pass for the Nest/Prisma
backend. Supabase is used as an external Postgres database; the public
application backend remains NestJS, not Supabase PostgREST.

## Applied Scope

The audit added repo-owned Prisma migrations for:

- RLS enablement and closed direct Supabase table access.
- Broad `anon` and `authenticated` table/sequence grant revocation.
- Domain checks for meal events, user profile fields, auth/session rows,
  carts, shopping carts, catalog tables, recipe child rows, capture imports,
  inventory, vision observations, and profile memory.
- JSON shape checks for persisted JSON columns.
- Ownership consistency FKs for shopping carts.
- FK index coverage and duplicate index cleanup.
- Partial lifecycle/index hygiene for carts and shopping carts.

## Current Verification

The latest audit checks against Supabase show:

- No missing FK-supporting indexes.
- No duplicate exact indexes.
- No public application tables without RLS.
- No broad `anon` or `authenticated` table grants.
- No unvalidated constraints.
- Prisma migrations are up to date.

Validation commands used:

```bash
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate status
pnpm --filter api build
pnpm --filter web build
```

`prisma generate` was also run after schema changes that affected the generated
client.

## Pending Operational Item

`BaseRecipe` still needs contract constraints for:

- `servings` range.
- `name` length.
- `description` length.
- `nutritionData` JSON object shape.

The data already satisfies the intended checks, but DDL with a short
`lock_timeout` cannot acquire the required lock because Supabase currently has a
stale Supavisor session `idle in transaction` holding `AccessShareLock` on
`BaseRecipe`.

The pending SQL and blocker inspection query live in:

```text
apps/api/prisma/scripts/pending-core-numeric-domain-constraints.sql
```

After that stale session is confirmed safe to terminate, create a fresh Prisma
migration from the pending SQL and apply it with `migrate deploy`.

## Out Of Scope

The recipe model redesign is intentionally out of this hardening pass. Adding
new recipe fields or restructuring recipe persistence should be handled as its
own mini-scope because it touches Prisma schema, DTO validation, Swagger/shared
types, Nest services, frontend forms/views, seed data, import/capture flows, and
AI recipe generation.
