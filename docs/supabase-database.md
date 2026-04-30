# Supabase Database

Chef can use either local Docker Postgres or the shared Supabase Postgres database.

The rule is:

- if `SUPABASE_DATABASE_URL` exists, the API and Prisma CLI use Supabase
- otherwise they fall back to `DATABASE_URL`, usually local Docker Postgres

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

From `apps/api`:

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
