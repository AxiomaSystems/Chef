# Contributing

## Branches

- `main`: stable production branch. Branch from it by default.
- `piero/*`, `enoch/*`, `gallo/*`, `ahmad/*`: individual work branches.
- `spike/*`: experiments or research that may not merge.
- `staging/*` or `integration/*`: temporary integration branches only when the team explicitly needs one.
- `demo/*`: legacy/demo snapshots. Do not use as a default base for new work.

Production deploys come from `main`:

- Vercel deploys the web app from `main`.
- Railway deploys the API from `main` after CI succeeds.
- PRs and feature branches may have previews, but they are not production truth.

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

Every PR should include:

- what changed
- risky areas
- commands run
- remaining issues

Integration PRs should also list branches or commits integrated.
