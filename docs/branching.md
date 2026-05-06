# Branching Policy - 2026-06-05

This document replaces the earlier demo-branch recommendation.

The repo should now converge toward a simpler model:

- `main` is the stable shared baseline
- feature work happens in short-lived personal or spike branches
- preview deploys happen on branches/PRs through Vercel
- production deploys come from `main`

## Current Recommendation

Use `main` as the primary branch for the repo.

Why:
- Week 7 backend stabilization has reduced major runtime unknowns
- API standards and CI baseline now exist
- long-lived demo branch naming is becoming a source of confusion
- Vercel production should have one clear source of truth

## Branch Roles

### `main`

- stable shared baseline
- branch protection target
- required CI target
- production source for Vercel once CI is consistently green

### `<person>/<topic>`

- active feature or fix work
- default place for day-to-day engineering changes
- should merge back through PRs into `main`

Examples:
- `piero/onboarding-backend`
- `enoch/shopping-editor`
- `galo/vision-spike`

### `spike/<topic>`

- experiments or research that may not merge
- use when architecture or product value is still uncertain

### Legacy demo branches

- `demo/2`, `piero/demo2`, and similar branches should be treated as transition-era integration branches
- do not start new work from them unless the team explicitly decides to keep one temporarily during migration

## Deploy Policy

### Preview deploys

- branches and PRs may create preview deploys in Vercel
- preview deploys are for validation, not for declaring the repo stable

### Production deploys

- production branch should be `main`
- production deploys should come only from changes intentionally merged into `main`
- if CI is still flaky, delay automatic production deploy until repeated green runs confirm stability

## Merge Rules

Before merging into `main`, the change should satisfy all of these:

- scope is coherent
- API/documentation updates are included when contracts changed
- smallest relevant tests/builds were run
- no unrelated demo-only hacks are bundled in
- feature is acceptable for production-facing deployment if Vercel is connected to `main`

## Transition Plan

### 1. Stabilize `main`

- merge the current stable work back into `main`
- verify CI against `main`
- make sure Vercel preview/production settings match the intended branch policy

### 2. Stop expanding legacy integration branches

- stop opening new work from `demo/2` or `piero/demo2`
- branch new work from `main`

### 3. Keep divergent experiments explicit

- branches like `ft-yolo_galo` or any large vision spike should be reviewed intentionally
- do not auto-fold them into `main` without scope review

### 4. Clean up old branches later

After confirming nothing active still depends on them:

- archive or delete old demo branches
- archive or delete already-absorbed legacy branches

## Practical Default

Use this model going forward:

- `main` = stable + production branch
- `<person>/<topic>` = feature work
- `spike/<topic>` = experiments

If the team needs a short-lived integration branch again for a specific event or demo, use a dated branch name and retire it afterward.
