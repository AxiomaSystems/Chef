# Main Stability And Launch Spec

Owner: papostigo
Collaborators: backend, frontend, deploy owners
Primary branch target: `main`
Current integration branch: `staging/week7`
Immediate milestone: Saturday, May 9, 2026 user testing
Launch milestone: Saturday, May 16, 2026

## Goal

Move Chef from "stabilized integration branch" mode into "stable trunk" mode.

From this point forward:

- `main` should be the most stable version of the product
- active work should converge into `main` continuously
- CI should validate `main`
- Vercel production should deploy from `main`
- Railway production should deploy from `main`

This spec is not about broad product expansion. It is about making the existing product reliable enough to test heavily this week and launch next week without branch confusion or deploy ambiguity.

## Why This Spec Exists

Week 7 backend stabilization materially improved:

- setup clarity
- env handling
- readiness and health checks
- provider readiness reporting
- CI baseline
- frontend/backend route clarity

That work appears to live on `staging/week7`, not yet as the final stable trunk story.

The next problem is organizational and operational:

- too many branches have historically behaved like semi-official truth sources
- docs still carry some transition-era assumptions
- production/staging branch expectations need one clear answer
- frontend integration needs to target the backend that actually exists now

This spec defines the next stable operating model.

## Success Criteria

We should consider this phase successful when all of the following are true:

- `main` contains the most stable backend and frontend behavior
- stable work is merged into `main` through reviewed PRs
- GitHub default branch is `main`
- CI runs on `main` and on PRs targeting `main`
- Vercel production deploys from `main`
- Railway production deploys from `main`
- user-testing-critical flows work from the current `main` deploy
- docs describe the current branch/deploy truth, not an old transition state

## Non-Goals

- Do not redesign the database broadly during this phase.
- Do not add Redis, mail verification, or CDN/storage unless one becomes an immediate launch blocker.
- Do not invent a new long-lived integration branch unless there is a one-off event and the team explicitly agrees to it.
- Do not block trunk stability behind speculative cleanup.

## Current Reality

Based on the repo state today:

- `demo/2` is no longer the best mental model for the product.
- `staging/week7` contains the meaningful backend stabilization work.
- local startup has been improved through root setup scripts and `local-dev-setup.md`.
- backend readiness and provider readiness now exist in code.
- API CI baseline now exists.
- frontend still needs to align around the stabilized backend route and provider/error behavior.

This means the repo is already past "random branch chaos," but it is not yet fully converged onto `main`.

## Operating Policy From Now On

### 1. `main` is the stable trunk

`main` is the branch we treat as:

- the most stable shared branch
- the production branch
- the required CI branch
- the branch teammates should branch from by default

### 2. Feature branches are short-lived

Use branches like:

- `piero/<topic>`
- `enoch/<topic>`
- `galo/<topic>`
- `ahmad/<topic>`

These are working branches, not alternative truth branches.

### 3. Integration branches are temporary exceptions

An integration branch is acceptable only when:

- multiple branches need coordinated validation together
- the merge is too risky to land directly in `main`
- there is a near-term event such as user testing or demo

If used, the integration branch should be short-lived and retired immediately after merge-back.

### 4. Production deploys come from `main`

Vercel:

- production branch should be `main`
- branch/PR deploys remain useful for preview validation

Railway:

- production service should deploy from `main`
- branch-based staging services are acceptable, but the canonical production path should be `main`

## Launch-Critical Product Flows

These flows matter most for user testing and launch:

1. user can sign up or sign in
2. onboarding/profile memory completes successfully
3. user can browse recipes
4. user can create or save a draft/cart
5. user can generate a shopping cart
6. provider readiness/errors are understandable
7. shopping-cart edits persist correctly
8. account/preferences/checkout profile updates persist correctly

If any of these fail on the deployed `main` branch, `main` is not yet stable enough.

## Backend Priorities

### Keep

- strict env validation
- `/health` and `/ready`
- provider readiness modeling
- explicit user-actionable errors for provider/location problems
- API CI baseline

### Confirm before merge to `main`

- backend tests pass locally
- CI passes for the branch/PR
- provider capability reporting matches actual runtime behavior
- docs still match reality after the merge

### Avoid

- broad schema churn
- route redesign beyond the agreed API standards
- introducing new infra dependencies this late unless they unblock launch directly

## Frontend Alignment Priorities

Enoch is currently adapting the UI to read the backend correctly and follow the intended principles. That is the right direction.

Frontend work in this phase should prioritize:

- using the stabilized `/api/v1` routes as source of truth
- preserving backend error messages where they are intentionally user-actionable
- aligning onboarding with `profile-memory` + onboarding completion
- aligning planning/shopping flows with the current cart and shopping-cart boundaries
- avoiding stale assumptions from older `demo/2` behavior

Useful handoff sources:

- `docs/frontend-ui-handoff.md`
- `docs/week7-backend-status.md`
- `docs/specs/api-refactor-standards.md`

## Required Docs To Keep Current

These docs should match reality through launch:

- `README.md`
- `local-dev-setup.md`
- `docs/branching.md`
- `docs/frontend-ui-handoff.md`
- `docs/week7-backend-status.md`

If branch policy or deploy policy changes again, update docs immediately instead of letting repo behavior drift away from documentation.

## Immediate Convergence Plan

### Phase 1: Validate `staging/week7`

Confirm on the integration branch:

- API build passes
- web build passes
- backend tests pass
- local startup still matches `local-dev-setup.md`
- key user-testing flows work

### Phase 2: Merge stable work into `main`

Once validated:

- open or complete PR from `staging/week7` into `main`
- resolve any final drift intentionally
- do not leave critical launch work stranded on staging

### Phase 3: Make `main` the deploy truth

After merge:

- set GitHub default branch to `main`
- require CI for merges to `main`
- point Vercel production to `main`
- point Railway production to `main`

### Phase 4: Resume normal feature flow

After convergence:

- branch all new work from `main`
- use previews for validation
- avoid creating another semi-permanent integration branch

## Validation Checklist

Before we call this converged:

- `main` contains the latest stable backend work from `staging/week7`
- `main` build passes locally
- `main` CI passes
- Vercel production branch is `main`
- Railway production branch/service source is `main`
- local dev docs still work from fresh clone
- onboarding works against deployed backend
- draft/cart/shopping-cart flow works against deployed backend
- provider failures are understandable in UI
- no critical flow depends on an unmerged side branch

## Risks

### Risk 1: branch-policy drift

The team may keep using old demo/integration branches out of habit.

Mitigation:

- update docs
- update GitHub default branch
- merge stable work promptly

### Risk 2: frontend/backend mismatch during convergence

Frontend may still assume old routes, old page flows, or older provider semantics.

Mitigation:

- use the frontend handoff doc
- validate launch-critical flows on the deployed branch, not only locally

### Risk 3: deploy config still points at the wrong branch

Even if code is stable, production may still deploy from an older branch or a preview branch.

Mitigation:

- explicitly confirm Vercel and Railway branch settings after merge

### Risk 4: docs freeze while code keeps moving

This repo has already had periods where branch/process truth moved faster than the written docs.

Mitigation:

- update the small number of key docs listed above whenever a trunk/deploy decision changes

## Recommended Next Actions

1. validate `staging/week7` as the current stable integration branch
2. merge it into `main`
3. make `main` the default branch
4. confirm CI and deploy settings point at `main`
5. let frontend finish aligning against the stabilized backend
6. use user testing to identify product issues, not branch/deploy confusion

## Bottom Line

The repo should now stop behaving like a collection of competing truths.

Chef needs:

- one stable trunk
- one deploy story
- one backend contract surface
- one frontend that reads that surface cleanly

That trunk should be `main`.
