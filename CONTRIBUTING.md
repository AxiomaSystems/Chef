# Contributing

## Branches

- `main`: stable shared baseline, production trunk, and default base for new work.
- `piero/*`, `enoch/*`, `gallo/*`, `ahmad/*`: short-lived individual work branches.
- `spike/*`: experiments or research that may not merge.
- `staging/*` or `integration/*`: temporary integration branches created only for an explicit multi-branch exercise or release rehearsal.
- `dev` and `demo/*`: legacy branches. Do not use them as normal bases or merge targets.

Create feature, fix, documentation, and hotfix branches from an up-to-date
`main`. Keep them focused and short-lived, then return them through a pull
request targeting `main`.

When a temporary integration branch is genuinely needed, record all of the
following in its integration PR or tracking issue:

- its purpose and owner
- the participating branches or commits
- the checks or rehearsal it must complete
- its exit condition
- when it will be merged or discarded and retired

Temporary integration branches do not replace `main` and must not become a
second permanent trunk.

## Deployments

Production deploys come from `main`:

- Vercel deploys the web app from `main`.
- Railway deploys the API from `main` after CI succeeds.
- PRs and feature branches may have preview deployments, but previews are not
  production truth and do not promote a branch to production.

Hotfixes follow the same model: branch from the current production state on
`main`, make the smallest safe change, run the relevant checks, and return the
fix to `main` through a focused PR. An emergency must not create a second
permanent production branch.

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

The allowed commit types are `feat`, `fix`, `chore`, `docs`, `refactor`,
`test`, and `ci`. Scopes are optional; when used, keep them short, lowercase,
and meaningful to the affected package or area.

Commitlint enforces this convention:

- locally, the Husky `commit-msg` hook checks each new commit
- in pull requests, GitHub Actions checks every commit between the PR base and head
- on pushes to `main`, GitHub Actions checks the pushed commit

Run Commitlint manually without changing files:

```powershell
pnpm commitlint --from origin/main --to HEAD --verbose
```

The repository currently permits merge, rebase, and squash strategies, so each
commit in a PR must satisfy the convention. If squash-only merging becomes the
repository policy later, the PR title must be validated because it becomes the
final commit title.

## Merge safeguards

Before merging into `main`:

- update the branch against current `main` and resolve conflicts intentionally
- run `pnpm verify` from the repository root
- run additional package, database, or end-to-end checks when the change requires them
- confirm required GitHub status checks pass
- include contract and documentation updates when behavior changed
- remove unrelated or environment-specific changes from the PR

`pnpm verify` is non-mutating and covers the package participation documented
in the root `package.json`. It does not include API end-to-end tests; use
`pnpm test:e2e` when that path is relevant. `vision-lab` runs its Python-owned
checks and is not part of TypeScript validation.

## PR expectations

Every PR should include:

- what changed
- risky areas
- commands run
- remaining issues

Integration PRs should also list branches or commits integrated.

Repository administrators should configure branch protection for `main` to
require the baseline CI checks, Commitlint, and an up-to-date reviewable branch
before merge. GitHub repository settings remain the enforcement source for
those protections.

## Verification commands

Run the standard non-mutating pre-PR verification from the repository root:

```powershell
pnpm verify
```

Run it after the normal `pnpm setup` setup path, which installs workspace
dependencies and generates the Prisma client. Vision lab checks are opt-in via
`pnpm test:vision-lab` and are not a product release gate.

The root commands select packages by capability instead of running every tool in every workspace:

| Command                | Packages                                      | Behavior                                                                                                               |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`           | `@cart/shared`, `api`, `web`                  | Builds shared contracts and the production web/API applications.                                                       |
| `pnpm test`            | `api`, `database-backup`                      | Runs repository tests, API unit tests, and backup-worker unit tests.                                                   |
| `pnpm test:vision-lab` | `vision-lab`                                  | Runs the opt-in Python research checks separately from product verification.                                           |
| `pnpm typecheck`       | `@cart/shared`, `api`, `web`, `mobile`        | Checks TypeScript packages; Python-only `vision-lab` and JavaScript-only `database-backup` are intentionally excluded. |
| `pnpm lint`            | `api`, `web`, `mobile`                        | Checks lint rules without modifying files.                                                                             |
| `pnpm format:check`    | repository                                    | Audits legacy repository formatting without modifying files; it is not part of `verify`.                               |
| `pnpm verify`          | build, test, typecheck, and lint participants | Runs lint, typecheck, unit/smoke tests, and build in order.                                                            |

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
