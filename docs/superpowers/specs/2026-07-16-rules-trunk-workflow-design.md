# RULES.md Production-Trunk Reconciliation Design

## Goal

Make `RULES.md` consistent with the production-trunk workflow established in
`CONTRIBUTING.md` and `docs/branching.md`, without weakening its useful
engineering standards or rewriting historical records.

## Current Problem

`RULES.md` is an active instruction file, but its branch guidance predates the
current workflow. It identifies `demo/2` as the shared integration branch,
directs personal work to branch from an integration branch, uses `galo/*`, and
defines merge readiness in terms of merging into `dev`.

Those statements can cause contributors and coding agents to choose the wrong
base, PR target, or deployment path even though the rest of the active policy
now uses `main` as the production trunk.

## Considered Approaches

### Rewrite the stale sections in place — selected

Keep `RULES.md` active and preserve its scope, ownership, schema, API, testing,
documentation, and AI-assistance rules. Replace only the obsolete branching,
verification, and integration language. This produces one concise diff and
retains the useful file that existing agents may already read.

### Archive `RULES.md`

Archiving would remove the contradiction but could break references or leave
contributors without the engineering rules that are not duplicated elsewhere.
It creates more cleanup than the current problem requires.

### Replace `RULES.md` with a pointer to `CONTRIBUTING.md`

A pointer would eliminate duplication, but it would also discard specialized
rules about ownership boundaries, AI-assisted work, schema changes, and contract
consistency. Those rules remain useful and should stay active.

## Canonical Policy and Boundaries

`CONTRIBUTING.md` is the canonical contribution policy. `RULES.md` reinforces
that policy for day-to-day engineering and explicitly defers to it when the two
files disagree.

This change edits `RULES.md` and adds this design record. It does not change
application code, tooling, deployment configuration, branch history, staging
infrastructure, or product positioning. `CONTRIBUTING.md` and
`docs/branching.md` remain authoritative inputs and are not edited by issue
#72. Any newly discovered contradiction outside `RULES.md` will be reported as
separate follow-up work rather than expanding this branch.

## Branch and Deployment Rules

The reconciled file will state:

- `main` is the stable shared baseline, default base, PR target, and only
  production trunk.
- Normal feature, fix, documentation, and hotfix work happens in short-lived
  branches created from an up-to-date `main`.
- `dev` and `demo/*` are legacy branches, not normal bases or merge targets.
- `staging/*` and `integration/*` are temporary tools for an explicit
  integration exercise and must follow the ownership, inputs, exit condition,
  and retirement lifecycle in `CONTRIBUTING.md`.
- Vercel branch and PR deployments are previews. Production web and API
  deployments originate from `main`.
- Hotfixes start from and return to `main` through focused PRs.
- Individual branches use the canonical `piero/*`, `enoch/*`, `gallo/*`, or
  `ahmad/*` prefixes. Experiments use `spike/*`; temporary coordination may use
  `staging/*` or `integration/*` under the lifecycle above. The old standalone
  `fix/*` option is removed because fixes use the responsible contributor's
  prefix.

## Merge Readiness and Commit Hygiene

The old integration rule will become a merge-readiness rule for PRs into
`main`. It will require coherent scope, intentional conflict resolution,
relevant documentation, and successful non-mutating checks.

The standard root gate is `pnpm verify`. Database-backed API end-to-end tests
and other task-specific validation remain additional checks when relevant.
Required GitHub status checks, including Commitlint, must pass. Commit message
types and scopes continue to be defined in `CONTRIBUTING.md` rather than copied
into a second policy table.

## Preserved Engineering Rules

The rewrite must preserve the intent of the existing sections covering:

- one coherent concern per branch
- ownership coordination
- human responsibility for AI-assisted changes
- Prisma migrations and complete schema wiring
- DTO, service, shared-type, Swagger, and test alignment for API contracts
- smallest relevant validation paths
- accurate documentation
- reviewable commits and PR descriptions

Wording may be tightened only where needed to connect these rules to `main` and
the current verification commands.

## Consistency Audit

Verification will search active instruction surfaces, including `AGENTS.md`,
`README.md`, `RULES.md`, `CONTRIBUTING.md`, and active files under `docs/`, for
guidance that makes `dev`, `demo/2`, or another permanent integration branch
the normal base or merge target.

Historical files under `docs/archive/**` and implementation/design records may
mention obsolete policies as history, exclusions, or search examples. They are
not active instructions and will not be rewritten merely to produce a blind
zero-match search.

## Preparation and Verification

If a clean worktree does not contain the generated Prisma client, preparation
will run `pnpm --filter api prisma:generate` explicitly. That command writes
ignored generated artifacts and is preparation, not a validation check. A
tracked-file status check will confirm that preparation changed no source file.

The change will then use non-mutating validation checks:

- targeted Prettier check for modified Markdown
- `git diff --check`
- scoped repository searches for contradictory active guidance and prefix drift
- `pnpm commitlint --from origin/main --to HEAD --verbose`
- `pnpm verify`

The PR will map results to issue #72, list intentionally retained historical
references, and remain unmerged for human review.
