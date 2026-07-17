# Trunk Development Safeguards Design

## Context

Preppie deploys production from `main`, while older repository guidance still
suggested long-lived integration branches. The repository also documented
semantic commit messages without enforcing them. Issue #71 replaces the
long-lived `dev` proposal with a production-trunk workflow and adds lightweight,
non-mutating commit-message enforcement.

## Decision

- `main` is the stable shared baseline and only production trunk.
- Work branches are short-lived, start from current `main`, and return through PRs.
- Vercel branch and PR deployments are previews; Vercel and Railway production
  deployments originate from `main`.
- `staging/*` and `integration/*` are temporary tools for named integration
  exercises. Each has an owner, inputs, checks, exit condition, and retirement
  point.
- Hotfixes start from and return to `main` through focused PRs.
- Commitlint enforces the documented semantic convention locally and across the
  full PR commit range in CI.

## Commit Enforcement

The root Commitlint configuration extends the Conventional Commits preset and
accepts the repository's existing types: `feat`, `fix`, `chore`, `docs`,
`refactor`, `test`, and `ci`.

Husky provides fast `commit-msg` feedback locally. A standalone GitHub Actions
workflow performs the authoritative check for every pull-request commit, so
contributors cannot bypass enforcement by disabling local hooks. The workflow
also checks pushes to `main` and does not write to the checkout.

The repository currently allows merge, rebase, and squash strategies. This
design therefore validates each commit in the PR. If repository settings later
require squash-only merges, PR-title validation should be added because the
title becomes the final commit title.

## Merge and Deployment Safeguards

Branches should be updated against current `main` before merge. Root verification
and any additional task-specific checks must pass, followed by the required
GitHub status checks. Repository administrators enforce those checks and review
requirements through branch protection.

Preview deployments support review but never become production truth. Production
web and API deployments continue to originate from `main`.

## Scope Boundary

Issue #71 updates `CONTRIBUTING.md`, `docs/branching.md`, commit tooling, and CI.
Issue #72 separately reconciles `RULES.md` and removes its active legacy branch
guidance. This design does not delete remote branches, provision staging
infrastructure, alter deployment providers, or change product positioning.
