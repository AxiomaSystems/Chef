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
- Base recipe contract constraints for servings, text lengths, and
  `nutritionData` JSON object shape.

## Current Verification

The latest audit checks against Supabase show:

- No missing FK-supporting indexes.
- No duplicate exact indexes.
- No public application tables without RLS.
- No broad `anon` or `authenticated` table grants.
- No unvalidated constraints on application-owned public tables.
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

## Completed Operational Item

The previous `BaseRecipe` blocker was a stale Supavisor session
`idle in transaction` holding `AccessShareLock` on `BaseRecipe`. After that
session was terminated, migration
`20260627120000_add_base_recipe_contract_constraints` applied and validated the
remaining base recipe checks.

Supabase still reports one unvalidated constraint in its own `realtime` schema:
`realtime.messages.messages_payload_exclusive`. That table is Supabase-managed
infrastructure, not an application-owned public table.

## Out Of Scope

The recipe model redesign is intentionally out of this hardening pass. Adding
new recipe fields or restructuring recipe persistence should be handled as its
own mini-scope because it touches Prisma schema, DTO validation, Swagger/shared
types, Nest services, frontend forms/views, seed data, import/capture flows, and
AI recipe generation.
