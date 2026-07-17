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

## Verification commands

Run the standard non-mutating pre-PR verification from the repository root:

```powershell
pnpm verify
```

Run it after the normal `pnpm setup:main` setup path, which installs workspace
dependencies and generates the Prisma client. Python 3.11+ must be available on
`PATH` for the fast vision smoke tests; they do not require model checkpoints or
provider credentials.

The root commands select packages by capability instead of running every tool in every workspace:

| Command             | Packages                                      | Behavior                                                                                 |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm build`        | `@cart/shared`, `api`, `web`                  | Builds shared contracts and the production web/API applications.                         |
| `pnpm test`         | `api`, `vision-lab`                           | Runs API unit tests and the four fast Python vision smoke tests.                         |
| `pnpm typecheck`    | `@cart/shared`, `api`, `web`, `mobile`        | Checks TypeScript packages; `vision-lab` is intentionally excluded.                      |
| `pnpm lint`         | `api`, `web`, `mobile`                        | Checks lint rules without modifying files.                                               |
| `pnpm format:check` | repository                                    | Audits legacy repository formatting without modifying files; it is not part of `verify`. |
| `pnpm verify`       | build, test, typecheck, and lint participants | Runs lint, typecheck, unit/smoke tests, and build in order.                              |

Automatic changes are always opt-in: use `pnpm lint:fix` for ESLint fixes or
`pnpm format` for Prettier formatting. Neither command is part of `pnpm verify`.

The API uses ESLint bulk suppressions to record its existing lint debt while
still failing on new violations. Updating that baseline is an explicit review
operation through `pnpm lint:baseline`; normal lint and verification never
rewrite the suppression file.

Database-backed API E2E tests are separate from the standard verification path:

```powershell
pnpm api:setup
pnpm test:e2e
```

They require the local Docker Postgres service, applied Prisma migrations, and
seed data. Provider-dependent tests and external staging smoke tests are also
kept separate so the standard local command does not require production secrets
or third-party services.
