# Supabase Database

Chef can use local Docker Postgres or a Supabase Postgres database.

The rule is:

- if `SUPABASE_DATABASE_URL` exists, the API and Prisma CLI use Supabase
- otherwise they fall back to `DATABASE_URL`, usually local Docker Postgres
- committed schema history lives in Prisma migrations, not Supabase dashboard changes

## Environment Variables

Use these variables in the root `.env`:

```bash
SUPABASE_DATABASE_URL="postgresql://..."
SUPABASE_DIRECT_URL="postgresql://..."
```

`SUPABASE_DATABASE_URL` should be the pooled Prisma/runtime URL from Supabase.

`SUPABASE_DIRECT_URL` should be the direct connection URL used by Prisma migrations.

The Prisma schema maps these to:

```prisma
url       = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
```

The API env loader and Prisma config translate the `SUPABASE_*` variables into `DATABASE_URL` and `DIRECT_URL` at runtime.

For isolated Supabase testing, update the root `.env` directly with the
test/staging project's pooled and direct Supabase connection strings. Keep any
previous URL commented in `.env` if you need to switch back manually.

## Passwords With Special Characters

Supabase database passwords can contain characters such as `@`.

If the password contains `@`, the safest option is to copy the Prisma connection strings directly from Supabase. If editing manually, encode `@` as `%40`.

Example:

```text
bad:  postgresql://postgres.project:abc@123@host/postgres
good: postgresql://postgres.project:abc%40123@host/postgres
```

The repo has a small defensive normalization for unescaped `@`, but do not rely on that for all special characters. Prefer the exact encoded URL from Supabase.

## Applying Migrations

For local Docker Postgres or an already-selected root `.env` target, from `apps/api`:

```bash
pnpm prisma:generate
.\node_modules\.bin\prisma.cmd migrate deploy
```

For development migrations, create the migration locally against a disposable/local database first, review the SQL, then apply it to Supabase with `migrate deploy`.

Do not run destructive reset commands against Supabase.

## Seeding

From the repo root:

```bash
pnpm --filter api db:seed
```

The seed is idempotent for the current catalog-style data and can be rerun when recipes, cuisines, tags, or demo users change.

## Current Status

As of April 30, 2026:

- Supabase is the shared team database for the current demo branch.
- All existing Prisma migrations have been applied.
- Seed data has been loaded.
- Local Docker Postgres remains available for isolated development.

## Row Level Security

Supabase warns when tables in the exposed `public` schema do not have Row Level Security enabled.

Chef does not use Supabase's generated PostgREST API as the application backend. The NestJS API is the only intended public application API, and Prisma owns database access.

For that reason, public tables have RLS enabled without permissive anon/auth policies:

- Supabase anonymous/browser clients should not read or mutate Chef tables directly.
- The backend connects through the database URL and remains responsible for auth, ownership, and authorization.
- If the app later uses Supabase Auth or direct browser reads, policies must be designed explicitly for that surface before exposing any table.

Do not add broad policies such as `USING (true)` just to quiet dashboard warnings.

When adding new Prisma tables in the `public` schema, include RLS in the same migration or run a follow-up migration that enables RLS across all public tables. A one-time catch-up migration only covers tables that existed when it ran.

New Supabase projects may also stop granting Data API access to new `public` tables by default. Chef's Nest/Prisma backend should not need broad `anon` or `authenticated` table grants. If a future feature deliberately uses Supabase's generated REST/GraphQL API or browser `supabase-js` table access, add explicit grants and narrowly scoped RLS policies in the same reviewed migration.

## Migration Discipline

Supabase is a shared database, but the repo owns database history.

Do not apply schema changes directly from the Supabase dashboard or from a local branch that will not be committed. Every schema change must land as a Prisma migration in `apps/api/prisma/migrations` with matching updates to `schema.prisma`, generated client, shared contracts, API code, tests, and docs.

The cart lifecycle reconciliation in `docs/cart-lifecycle.md` is the reference incident: Supabase had a shopping-cart lifecycle migration applied outside the repo, and the fix was to roll forward with a repo-owned migration instead of editing production state by hand.
