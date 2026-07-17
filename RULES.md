# RULES

This file defines the working rules for contributing to Preppie.

These rules apply to all contributors, whether work is written directly by a human or with AI assistance.

`CONTRIBUTING.md` is the canonical contribution policy. If this file and
`CONTRIBUTING.md` disagree, follow `CONTRIBUTING.md` and fix the stale guidance
in a focused documentation change.

## Purpose

The repo moves quickly and has multiple owners across backend, frontend, AI, and product surfaces.

The goal of these rules is to prevent:

- mixed-scope branches
- accidental breakage across ownership boundaries
- schema drift
- undocumented API changes
- low-confidence commits landing without verification

## Branching

### Main branch roles

- `main` is the stable shared baseline, default base, pull request target, and only production trunk
- normal work happens in short-lived branches created from an up-to-date `main`
- `dev` and `demo/*` are legacy branches, not normal bases or merge targets
- `staging/*` and `integration/*` are temporary coordination branches only when the team explicitly needs a multi-branch integration exercise or release rehearsal

Temporary coordination branches must follow the ownership, participating
inputs, exit condition, and retirement rules in `CONTRIBUTING.md`. They do not
replace `main` and must not become permanent integration branches.

### Branch naming

Individual work uses the contributor prefixes defined in `CONTRIBUTING.md`:

- `piero/<topic>`
- `enoch/<topic>`
- `gallo/<topic>`
- `ahmad/<topic>`
- `spike/<topic>`

Use `staging/<purpose>` or `integration/<purpose>` only for the temporary
coordination cases described above. Fixes and hotfixes use the responsible
contributor's prefix rather than a standalone `fix/*` branch.

Examples:

- `piero/onboarding-profile`
- `enoch/onboarding-ui`
- `gallo/ai-rate-limits`
- `spike/vision-lab`

Do not create new branches with names like:

- `demo2`
- `demo/3`
- `ft-something`
- vague names that do not communicate ownership or scope

### Deployments and hotfixes

- Vercel branch and pull request deployments are previews for validation, not production truth
- production web and API deployments originate from `main`
- hotfixes branch from the current production state on `main` and return to `main` through a focused pull request
- an emergency does not create a second permanent production or integration branch

## Scope Discipline

One branch should represent one coherent piece of work.

Allowed examples:

- onboarding backend model
- onboarding UI implementation
- AI rate limiting
- meal plan bug fix

Not allowed:

- onboarding plus unrelated AI changes
- schema work plus random dashboard tweaks
- “while I was here” edits in someone else’s area

If a second concern appears while you are working:

- either open a new branch
- or explicitly coordinate with the owner before continuing

## Ownership Boundaries

Every non-trivial change should have a clear owner.

Before touching an area that someone else is actively working on:

- check whether there is an active branch already
- check whether there is an agreed owner
- coordinate before modifying their lane

This matters especially for:

- onboarding UI
- AI surfaces
- database schema
- auth
- deploy and infra

## AI-Assisted Work

AI-assisted work is allowed.

AI-assisted work is not exempt from engineering standards.

If AI was used to write or reshape code, the contributor is still responsible for:

- understanding the code
- validating behavior
- removing hallucinated or low-signal changes
- keeping scope clean
- documenting contract changes

“The agent wrote it” is never enough justification for merging it.

## Database Rules

Any Prisma schema change must include:

- a matching migration
- relevant API/service updates
- relevant shared-type updates if the contract changed
- verification against a real database path before merge

Do not commit:

- schema-only changes without migration
- partially wired fields that are not exposed or tested
- dead columns added “for later” unless they are explicitly approved

## API Contract Rules

Any API contract change must update all relevant layers:

- DTOs
- service logic
- shared types in `packages/shared`
- Swagger examples or response DTOs when applicable
- tests for the changed behavior

Do not let the frontend and backend invent separate versions of the same contract.

## Testing Minimums

Before asking for merge, the contributor should run the smallest relevant validation set for the change.

The standard non-mutating repository gate is:

```powershell
pnpm verify
```

Run additional database-backed, provider-dependent, end-to-end, or manual
checks when the change requires them. `CONTRIBUTING.md` documents package
participation and setup prerequisites. If something was not tested, say so
clearly.

Examples:

- backend contract change:
  - `pnpm --filter api prisma:generate`
  - `pnpm --filter api build`
  - relevant API tests

- shared-type change:
  - relevant app builds that consume the type

- frontend UI change:
  - `pnpm --filter web build`
  - route-level manual verification when needed

## Documentation Expectations

Update docs when the change affects:

- schema shape
- API contract
- deployment behavior
- user flows
- branch policy

Good docs are short and precise. Do not write vague “updated docs” filler.

## Commit and PR Hygiene

Commits and PRs should make review easier, not harder.

A contributor should avoid:

- giant mixed commits
- drive-by formatting unrelated to the task
- hidden breaking changes
- broad “misc fixes” descriptions

A good branch should answer:

- what changed
- why it changed
- how it was verified
- what is intentionally not included

Use the semantic commit types and scope guidance in `CONTRIBUTING.md`.
Commitlint checks messages locally and in GitHub Actions; required repository
status checks must pass before merge.

## Merge Readiness

`main` is not a dumping ground.

Before merging a pull request into `main`, ask:

- is the scope coherent?
- does it overlap active work from someone else?
- is it verified?
- is it documented if the contract changed?
- is the branch updated against current `main` with conflicts resolved intentionally?
- did `pnpm verify`, Commitlint, and all other required status checks pass?

If the answer to any of those is no, do not merge yet.

## Practical Default

When in doubt:

- keep scope smaller
- branch separately
- verify more
- document the contract
- ask before touching another owner’s lane
