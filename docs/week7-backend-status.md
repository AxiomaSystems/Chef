# Week 7 Backend Status - 2026-05-06

This document summarizes the backend stabilization work completed from the Week 7 plan and records the current repo posture after that work.

It is intentionally short and operational.

## Goal Of This Slice

The backend slice was not about broad product expansion.

It was about making the current Chef vertical slice more reliable for team use, user testing, and production-facing deployment.

The work focused on:

- clearer local setup
- clearer provider readiness
- better runtime errors
- stronger API standards
- backend CI baseline
- cleaner transition toward `main` as the stable branch

## What Was Completed

### 1. Local setup documentation

Created:

- `local-dev-setup.md`

Purpose:

- document fresh-clone setup
- clarify env expectations
- document database and Prisma flow
- explain API/web/full-stack startup paths

### 2. Environment and startup hardening

Relevant files:

- `apps/api/src/env.ts`
- `apps/api/prisma.config.ts`

What changed in practice:

- backend startup now has a clearer critical-env posture
- provider-specific env gaps degrade more explicitly
- Prisma and API env expectations are easier to reason about

### 3. Health and readiness endpoints

Implemented:

- `GET /health`
- `GET /ready`

Purpose:

- separate process liveness from real traffic readiness
- expose database readiness
- expose provider-readiness shape without making expensive live calls
- reuse the same provider-readiness status language as retailer capabilities

### 4. Retailer/provider readiness contract

Key result:

- provider readiness is now a first-class backend concern instead of hidden boolean assumptions

Relevant files:

- `apps/api/src/providers/provider-readiness.ts`
- `apps/api/src/retailers/retailers.service.ts`
- `apps/api/src/matching/matching.service.ts`
- `apps/api/src/cart-export/cart-export.service.ts`
- `packages/shared/src/product.ts`

Key behavior:

- shared status language now includes states like:
  - `configured`
  - `missing_credentials`
  - `disabled`
  - `partner_required`
- `GET /api/v1/retailers/capabilities` now reflects runtime capability/readiness more accurately

### 5. Better runtime errors for launch-critical paths

Relevant file:

- `apps/api/src/cart/cart.service.ts`

Improved behavior:

- missing shopping location for live retailer flows now fails explicitly
- missing provider credentials now fail explicitly
- error messages are more UI-usable instead of looking like generic backend failures

Examples:

- `Set your shopping location first before using Kroger search.`
- `Kroger search is unavailable because provider credentials are missing.`
- `Instacart handoff is unavailable because provider credentials are missing.`

### 6. Focused test hardening

Added/updated tests around:

- health/readiness
- retailer capabilities
- shopping-cart generation edge cases
- provider credential failures
- persisted runtime behavior for critical cart flows

Relevant files include:

- `apps/api/src/cart/cart.service.spec.ts`
- `apps/api/src/matching/matching.service.spec.ts`
- `apps/api/src/retailers/retailers.service.spec.ts`
- `apps/api/test/app.e2e-spec.ts`

### 7. API design standards documented

Created:

- `docs/specs/api-refactor-standards.md`

Updated:

- `AGENTS.md`

Purpose:

- standardize route design for future backend changes
- require use of `api-design-principles` when creating or redesigning endpoints
- keep migration ideas separate from current stabilization work

### 8. GitHub Actions API baseline

Created:

- `.github/workflows/api-baseline.yml`
- `.github/workflows/web-baseline.yml`
- `.github/workflows/vision-baseline.yml`

Current purpose:

- verify backend install/build/test behavior in a clean CI environment
- run Postgres service in CI
- run Prisma generate + migrate + seed
- run API build + unit tests + e2e tests

Current trigger policy:

- `pull_request`
- `push` to `main`

This was narrowed intentionally so CI does not fire on every branch push.

Current status:

- API baseline is green on `main`
- web baseline is green on `main`
- vision baseline is green on `main`

### 9. Branching and deploy posture updated

Updated:

- `docs/branching.md`

Current direction:

- `main` is the stable shared baseline
- feature work should happen in short-lived personal branches
- preview deploys can continue on branches/PRs
- production should come from `main`

Production status:

- Vercel web production deploys from `main`
- Railway API production deploys from `main`
- Railway API uses the root `Dockerfile`
- Railway API healthcheck path should be `/ready`
- Railway Wait for CI should remain enabled

### 10. Frontend handoff for backend route drift

Created:

- `docs/frontend-ui-handoff.md`

Purpose:

- help the UI engineer fix 404s and stale assumptions after backend route and contract stabilization
- point to the frontend files most likely to need updates
- document canonical route families and validation order

## Validation Completed During This Slice

The stabilization work included repeated validation of the backend path, including:

- shared package build
- API build
- focused unit tests
- API e2e tests

The exact GitHub Actions environment can still reveal Linux-specific or CI-specific gaps, which is expected for a new baseline.

## Current Repo Posture After This Work

### Stable direction

- backend contracts are more explicit
- provider readiness is visible to the API and UI
- major runtime failure modes are easier to understand
- API route standards are documented
- CI baseline exists
- branch policy now uses `main` as the stable production branch
- Vercel and Railway are aligned to `main`

### Still transitional

- legacy demo branches still exist and should be cleaned up intentionally later
- frontend and backend may still drift if route/payload changes are not documented in PRs
- CDN/storage and email confirmation remain separate future slices

## Recommended Immediate Next Steps

1. protect `main` with required CI if not already enforced
2. keep preview deploys for PRs/branches
3. keep Railway Wait for CI enabled
4. clean up legacy integration branches only after confirming nobody still depends on them
5. document any route, schema, env, or deploy behavior changes in the same PR that changes code

## Bottom Line

Week 7 backend work moved the repo from "demo branch stabilization" toward "production-shaped backend foundation".

The most important outcomes are:

- clearer setup
- clearer provider behavior
- better runtime failure messages
- stronger API standards
- backend CI baseline
- a cleaner path to `main` as the stable production branch
