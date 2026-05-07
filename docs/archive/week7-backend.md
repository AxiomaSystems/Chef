# Week 7 Backend Stabilization Spec

Owner: papostigo
Primary agent: Cline + Codex
Branch target: `main` or a short-lived feature branch that merges back into `main`
Target user testing date: Saturday, May 9, 2026
Target launch date: Saturday, May 16, 2026

## Goal

Stabilize the backend, local setup, provider configuration, and deployment path before large user testing.

The app currently runs end-to-end. This week is not about broad product expansion. It is about making setup reproducible, provider behavior explicit, deployment debuggable, and backend failure modes easier to understand.

## Current Repo Signals

- Root setup scripts already exist in `package.json`: `setup`, `setup:main`, `setup:live`, `dev`, `dev:main`, `dev:all`, `api:setup`, `api:reset`, `api:up`, `vision:setup`, and `vision:checkpoints`.
- Main setup script lives at `scripts/setup-dev.ps1`.
- Vision setup lives at `apps/vision-lab/setup.ps1`.
- Root `.env.example` is the current best candidate for workspace env documentation.
- API env loading currently happens in `apps/api/src/env.ts`, which loads root `.env` and `apps/api/.env`, then maps Supabase env vars into Prisma env vars.
- Web reads `API_BASE_URL` through `apps/web/src/lib/auth.ts`.
- Docker currently covers local Postgres only through `infra/docker/docker-compose.yml`.
- API deploy is container-oriented through the root `Dockerfile`.
- Vercel project metadata exists under `.vercel/` and `apps/web/.vercel/`, but those directories are ignored and local-machine specific.
- The repo now includes `apps/mobile`, `apps/vision-lab`, and `apps/llm-testing` in addition to `apps/api` and `apps/web`.

## Non-Goals For This Week

- Do not redesign the Prisma schema broadly.
- Do not add Redis unless a measured bottleneck requires it.
- Do not implement the full email confirmation system in this stabilization slice.
- Do not implement the CDN/storage slice unless recipe images are actively blocking user testing.
- Do not add aggressive Husky hooks before CI and setup are stable.
- Do not make frontend design changes unless needed to surface backend errors clearly.

## Priority Order

1. Local setup documentation and command cleanup.
2. Environment source-of-truth audit and clearer startup failures.
3. Deployment configuration notes for Vercel and Railway.
4. Health/readiness endpoints.
5. Retailer/provider readiness and user-actionable errors.
6. Focused backend tests for launch-critical flows.
7. GitHub Actions API baseline.
8. Prisma/Postgres modeling audit, with only low-risk fixes before user testing.
9. Husky, CDN, email confirmation, Redis after the user-testing path is stable.

## Task 1: Create `local-dev-setup.md`

Cline should create `local-dev-setup.md` at the repo root after analyzing how the repo starts today.

Do not write this file from memory. First inspect:

- `package.json`
- `scripts/setup-dev.ps1`
- `apps/vision-lab/setup.ps1`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/vision-lab/package.json`
- `apps/mobile/package.json` if present
- `.env.example`
- `apps/api/src/env.ts`
- `Dockerfile`
- `infra/docker/docker-compose.yml`
- `README.md`

The doc should cover:

- prerequisites
- first-time setup from fresh clone
- which `.env` file is the source of truth
- database setup and reset
- Prisma generate/migrate/seed flow
- how to run API only
- how to run web only
- how to run web + API without vision
- how to run full stack with vision
- how to run mobile if supported
- common setup failures and fixes
- checkpoint/model file expectations for vision
- deployment-specific env notes

Keep it short enough that the team will actually use it.

## Docker Setup Decision

Cline should evaluate whether Docker should stay Postgres-only or become a fuller local development stack.

Acceptable outcomes:

- Keep Docker as Postgres-only and document the current scripts clearly.
- Add a separate optional compose profile for API/web/vision if it reduces setup friction.
- Defer full Dockerization if it would slow the team down before Saturday.

Do not force full Dockerization this week unless it clearly makes fresh-clone setup easier and can be verified quickly.

## Task 2: Centralize Environment Configuration

Audit duplicate env usage across root, `apps/api`, and `apps/web`.

Questions to answer in docs or code comments:

- What does local API read?
- What does local web read?
- What does Railway backend production need?
- What does Vercel frontend production need?
- What do tests and scripts need?

Expected direction:

- Root `.env` should be the local development source of truth unless a strong reason appears.
- `apps/api/src/env.ts` should either clearly document why it reads both root `.env` and `apps/api/.env`, or it should be simplified.
- Missing critical backend env vars should fail early with clear messages.
- Optional provider vars should degrade clearly instead of crashing unexpectedly.

Critical backend env vars:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_JWT_SECRET`
- `AUTH_ACCESS_TOKEN_EXPIRES_IN`
- `AUTH_REFRESH_TOKEN_EXPIRES_IN_DAYS`

Optional or provider-specific env vars:

- `SUPABASE_DATABASE_URL`
- `SUPABASE_DIRECT_URL`
- `GOOGLE_CLIENT_ID`
- `KROGER_USE_REAL_PROVIDER`
- `KROGER_CLIENT_ID`
- `KROGER_CLIENT_SECRET`
- `INSTACART_USE_REAL_PROVIDER`
- `INSTACART_API_KEY`
- `INSTACART_ENV`
- `INSTACART_API_BASE_URL`
- `WALMART_USE_REAL_PROVIDER`
- `WALMART_CLIENT_ID`
- `WALMART_CLIENT_SECRET`
- `WALMART_ENV`
- `CHEF_LLM_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_RATE_LIMIT_WINDOW_MS`
- `AI_RATE_LIMIT_MAX_REQUESTS`
- `VISION_API_BASE_URL`
- `VISION_DETECTOR`
- `VISION_YOLO_MODEL`

Frontend env vars:

- `API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- ElevenLabs or browser voice env vars if required by the current web code

## Task 3: Deployment Notes

Create or update deployment documentation only after inspecting current config.

Document:

- Vercel project root should be `apps/web`.
- Vercel production branch should be `main` once the transition is complete.
- Vercel build command and install command.
- Railway backend service should deploy the API container from the root `Dockerfile`.
- Railway should use production database env vars and provider env vars.
- Railway should not depend on local `.env`.
- How to debug deploy failures using health/readiness endpoints once added.

Avoid committing local `.vercel` metadata changes unless intentional.

## Task 4: Health And Readiness Endpoints

Add backend endpoints:

- `GET /health`
- `GET /ready`

Expected behavior:

- `/health` confirms the API process is alive.
- `/ready` confirms the API can serve real traffic.
- `/ready` should check Prisma/Postgres connectivity.
- `/ready` should report provider configuration state without making expensive external calls.

Suggested response shape:

```json
{
  "status": "ready",
  "service": "api",
  "database": {
    "status": "ready"
  },
  "providers": {
    "kroger": {
      "status": "configured"
    },
    "instacart": {
      "status": "missing_credentials"
    },
    "walmart": {
      "status": "disabled"
    }
  }
}
```

Add focused tests for healthy and missing-config states.

## Task 5: Retailer And Provider Readiness

Stabilize only the demo-critical provider path first.

Inspect:

- `apps/api/src/retailers/retailers.service.ts`
- `apps/api/src/cart-export/cart-export.service.ts`
- `apps/api/src/matching/kroger-retailer-product.provider.ts`
- `apps/api/src/matching/walmart-retailer-product.provider.ts`
- `apps/api/src/matching/matching.service.ts`
- `apps/api/src/cart/cart.service.ts`

Expected behavior:

- `/api/v1/retailers/capabilities` should accurately reflect runtime provider state.
- Missing credentials should be explicit.
- Missing user location should be explicit.
- Provider unavailable should be explicit.
- Cart export failures should return useful errors.
- Frontend should receive messages that can be shown to users.

Do not make Walmart prominent unless it is genuinely configured.

## Task 6: Focused Tests

Add tests where they reduce Saturday risk:

- env validation behavior
- health/readiness behavior
- retailer capability states
- provider missing credentials
- no user location for location-required provider
- cart export failure path if Instacart is the demo path
- cart generation still works with mock provider

Do not attempt broad coverage cleanup this week.

## Task 7: GitHub Actions Baseline

Add a minimal API CI workflow after local commands are stable.

Recommended first workflow:

- install with `pnpm install --frozen-lockfile`
- run Prisma generate
- run API build
- run API tests

Do not require production secrets for CI.

## Task 8: Prisma/Postgres Audit

Do an audit this week, but only implement low-risk fixes.

Look for:

- missing indexes on high-use queries
- missing uniqueness constraints where duplicates are clearly invalid
- cascade/delete behavior that could orphan user-owned records
- JSON fields that are causing immediate query or consistency problems

Do not normalize large areas before Saturday unless a concrete bug requires it.

Write findings down even if the fix is deferred.

## Later Slices

Email confirmation:

- Treat as its own auth slice.
- Likely needs token model, mail provider, resend flow, and UI states.
- Queueing can come later unless sending blocks requests or becomes flaky.

CDN/storage:

- Treat as recipe/media storage slice.
- First decide provider: Supabase Storage, Cloudflare R2, Vercel Blob, or another storage layer.
- Define upload path, public URL shape, cache behavior, and fallback.
- Do not block Saturday unless recipe images are breaking the demo.

Husky:

- Add only after core commands and CI expectations are clear.
- Prefer lightweight formatting/lint-staged checks.
- Avoid hooks that block teammates with slow or flaky tests.

Redis:

- Defer until a measured provider/search/cache need exists.
- Make it optional if introduced.

## Verification Checklist

Before calling this week done:

- Fresh clone setup path is documented.
- `pnpm setup:main` or equivalent works for web + API local setup.
- `pnpm dev:main` runs web + API without requiring vision.
- `pnpm setup` works or clearly documents vision requirements.
- Prisma client generation is documented and works.
- Database migrate/seed/reset paths are documented.
- API can report `/health`.
- API can report `/ready`.
- Provider capability states are explicit.
- Vercel and Railway deploy expectations are documented.
- API build passes.
- Relevant backend tests pass.

## Cline Operating Rules

- Read `AGENTS.md` and `RULES.md` before editing.
- Keep changes scoped to backend/setup/docs unless explicitly approved.
- Do not touch unrelated frontend UI.
- Do not redesign Prisma schema broadly.
- Do not add Redis, email, CDN, or Husky in the same PR as env/setup stabilization.
- Prefer small commits or small PRs that the team can review quickly.
- When uncertain, document the finding and defer risky changes.
