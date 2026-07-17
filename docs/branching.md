# Branching Policy

This document defines Preppie's production-trunk workflow. `CONTRIBUTING.md` is
the canonical contributor contract when this document and another active guide
disagree.

The repo now uses a simple production-trunk model:

- `main` is the stable shared baseline
- feature and fix work happens in short-lived branches created from `main`
- pull requests return directly to `main`
- preview deployments happen on branches and PRs through Vercel
- production deployments come only from `main` through Vercel and Railway

## Current Recommendation

Use `main` as the primary branch and default base for the repo.

Why:

- one shared baseline keeps integration state visible
- short-lived branches reduce drift and conflict accumulation
- preview deployments provide validation without creating a second trunk
- Vercel and Railway production have one clear source of truth

## Branch Roles

### `main`

- stable shared baseline
- branch protection target
- required CI target
- production source for Vercel web
- production source for Railway API

### `<person>/<topic>`

- active feature or fix work
- default place for day-to-day engineering changes
- branches from an up-to-date `main`
- merges back through a focused PR into `main`
- retires after merge or abandonment

Examples:

- `piero/onboarding-backend`
- `enoch/shopping-editor`
- `gallo/vision-spike`

### `spike/<topic>`

- experiments or research that may not merge
- use when architecture or product value is still uncertain

### `staging/<purpose>` or `integration/<purpose>`

- temporary branch for a named multi-branch integration exercise or release rehearsal
- created only when separate PR previews cannot validate the interaction adequately
- never a general day-to-day development base or permanent merge target

Before creating one, record:

- purpose and owner
- participating branches or commit SHAs
- checks, environment, or rehearsal being coordinated
- exit condition and expected retirement point

Merge or discard the result when the exercise finishes, then retire the branch.
Any production-ready result still returns to `main` through a reviewable PR.

### Legacy branches

- `dev` and `demo/*` are transition-era branches, not normal bases or targets
- do not start new work from them
- archive or delete obsolete branches only after confirming nobody depends on them

## Deploy Policy

### Preview deploys

- branches and PRs may create preview deploys in Vercel
- preview deploys are for validation, not for declaring the repo stable
- a preview does not change the production source of truth

### Production deploys

- production branch is `main`
- Vercel deploys the web app from `main`
- Railway deploys the API from `main`
- Railway should wait for GitHub CI before deploying
- production deploys should come only from changes intentionally merged into `main`

## Merge Rules

Before merging into `main`, the change should satisfy all of these:

- scope is coherent
- branch is updated against current `main` and conflicts are resolved intentionally
- API/documentation updates are included when contracts changed
- `pnpm verify` and any additional relevant checks were run
- required GitHub status checks, including Commitlint, pass
- no unrelated environment-specific changes are bundled in
- feature is acceptable for production-facing deployment if Vercel is connected to `main`

Commit types, scopes, examples, local validation, and merge-strategy implications
are defined in `CONTRIBUTING.md`.

Protect `main` in GitHub repository settings with the required baseline checks,
Commitlint, and the team's chosen review/freshness requirements. Documentation
describes the policy; repository settings enforce it.

## Hotfixes

- branch from the current production state on `main`
- keep the fix narrow
- run root verification and any incident-specific checks
- return the change to `main` through a focused PR
- do not establish a second permanent production or emergency branch

## Legacy Cleanup

The transition to `main` as production trunk is complete. The remaining cleanup is behavioral:

- stop expanding legacy integration branches
- keep divergent experiments explicit
- large vision spikes should be reviewed intentionally
- do not auto-fold them into `main` without scope review

After confirming nothing active still depends on them:

- archive or delete old demo branches
- archive or delete already-absorbed legacy branches

## Practical Default

Use this model going forward:

- `main` = stable + production branch
- `<person>/<topic>` = feature work
- `spike/<topic>` = experiments

If the team needs a temporary integration branch, use a purpose-specific name,
record its lifecycle, and retire it immediately after its exit condition is met.
