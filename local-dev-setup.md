# Local Dev Setup

Short setup guide for **web + API first** (vision optional).

## Prerequisites

- Node 22+
- pnpm version from the root `packageManager` field
- Docker Desktop (for local Postgres)
- Optional for vision: Python 3.11+

## Source of truth for local env

- Local env source of truth is **root**: `./.env`
- Create from template if missing:

```powershell
Copy-Item .env.example .env
```

Notes:

- API/Prisma/seed now read root `.env`.
- Web local config should also come from root `.env` (no need to rely on `apps/web/.env.local`).
- `.vercel/.env*` and `apps/web/.env.vercel.*` are machine/deploy artifacts, not local source-of-truth.
- API fails fast on missing critical env vars: `DATABASE_URL`, `DIRECT_URL`, `AUTH_JWT_SECRET`, `AUTH_ACCESS_TOKEN_EXPIRES_IN`, `AUTH_REFRESH_TOKEN_EXPIRES_IN_DAYS`.
- Provider flags (`*_USE_REAL_PROVIDER=true`) with missing credentials now warn clearly at startup.

## Env matrix (quick reference)

- **Local API/Web:** root `.env`
- **Railway (API prod):** Railway service env vars (do not depend on local `.env`)
- **Vercel (Web prod):** Vercel project env vars (do not depend on local `.env`)

## First-time setup (web + API, no vision)

```powershell
pnpm setup:main
```

What this does:

1. installs workspace deps
2. starts local Postgres (`infra/docker/docker-compose.yml`)
3. runs Prisma generate
4. applies migrations
5. runs seed

Then run:

```powershell
pnpm dev:main
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`

## Full setup (includes vision)

```powershell
pnpm setup
pnpm dev
```

Vision is optional for the main web/API flow. The Nest API can run without the
Python sidecar, but real media scans through `/api/v1/vision` require the
FastAPI sidecar at `VISION_API_BASE_URL` plus the expected checkpoint files.

Optional live camera deps:

```powershell
pnpm setup:live
```

## API-only flow

```powershell
pnpm api:setup
pnpm dev:api
```

## Web-only flow

```powershell
pnpm dev:web
```

## DB reset / maintenance

```powershell
pnpm api:reset
pnpm --filter api prisma:generate
```

## Common failures

### Docker daemon not running

Symptom during setup:

- `failed to connect to the docker API ... dockerDesktopLinuxEngine`

Fix:

1. Start Docker Desktop
2. Re-run `pnpm setup:main`

### Using Supabase URLs instead of local Docker DB

If `SUPABASE_DATABASE_URL` / `SUPABASE_DIRECT_URL` are set in root `.env`, Prisma will use those values.

For local Docker DB, ensure:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cart_generator?schema=public
DIRECT_URL=
SUPABASE_DATABASE_URL=
SUPABASE_DIRECT_URL=
```

### Vision checkpoint files missing

Run:

```powershell
pnpm vision:checkpoints
```

Expected classifier path pattern:

- `apps/vision-lab/checkpoints/classifiers/ingredient/<run>/best_model.pt`

## Deployment env reminder

- Railway/API and Vercel/Web must use their own platform env vars.
- Do **not** assume local `.env` exists in deploy.
- Railway/API deploys from the root `Dockerfile`.
- Railway/API production source is repo `AxiomaSystems/Chef`, branch `main`, with no root directory override.
- Railway/API should keep custom start command empty and use the Dockerfile `CMD`.
- Railway/API should use `/ready` as the healthcheck path.
- Railway/API should enable Wait for CI before automatic production deploys.
- Railway/API should set `RUN_DB_SEED_ON_STARTUP=true` only for demo/staging environments that intentionally need seed data on boot.
- Vercel/Web needs `API_BASE_URL` pointed at the deployed API `/api/v1` base URL.
- Vercel/Web production source is branch `main`, root directory `apps/web`.
- The production frontend domain is `chef.postigo.sh`; do not assign that domain to the Railway API service.
- Optional web integrations such as `UNSPLASH_ACCESS_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` should be configured in Vercel only when the corresponding UI feature is enabled for testing.
- Real vision media scans need a deployed Python sidecar and `VISION_API_BASE_URL`; otherwise the product should treat vision as mock/optional.
