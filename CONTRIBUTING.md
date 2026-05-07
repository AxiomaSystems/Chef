# Contributing

## Branches

- `main`: stable/deployable branch. No direct pushes.
- `dev`: active integration branch.
- `demo/*`: demo-specific snapshots.
- `staging/*`: sprint or weekly integration branches.
- `integration/*`: temporary integration branches.
- `piero/*`, `enoch/*`, `gallo/*`, `ahmad/*`: individual work branches.

## Commit format

Use short semantic commits:

- `feat(scope): add new behavior`
- `fix(scope): fix broken behavior`
- `chore(scope): tooling, config, dependencies`
- `docs(scope): documentation only`
- `refactor(scope): restructure without behavior change`
- `test(scope): tests`
- `ci(scope): CI/CD changes`

Examples:

- `fix(api): stabilize readiness endpoint`
- `feat(web): add mobile onboarding layout`
- `ci(api): add baseline unit test workflow`
- `docs(env): centralize local setup guide`
- `chore(repo): tighten ignored local artifacts`

## PR expectations

Every integration PR should include:

- what changed
- branches or commits integrated
- risky areas
- commands run
- remaining issues
