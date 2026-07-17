# Reliable Root Verification Design

## Objective

Make issue #84's root verification commands trustworthy, non-mutating, and explicit about which workspace packages participate in each check.

## Command model

Root commands will select packages by capability instead of recursively executing the same tool in every workspace:

| Root command | Participating packages | Purpose |
| --- | --- | --- |
| `pnpm build` | `@cart/shared`, `api`, `web` | Produce the launch-path TypeScript applications and shared contracts. |
| `pnpm test` | `api`, `vision-lab` | Run API unit tests and fast Python vision smoke tests. |
| `pnpm typecheck` | `@cart/shared`, `api`, `web`, `mobile` | Type-check TypeScript packages; never invoke TypeScript in `vision-lab`. |
| `pnpm lint` | `api`, `web`, `mobile` | Run the canonical lint check without applying fixes. |
| `pnpm lint:fix` | `api`, `web`, `mobile` | Apply explicitly requested lint fixes; never called by verification. |
| `pnpm format:check` | repository files | Audit legacy formatting without writing changes; kept outside standard verification. |
| `pnpm verify` | build, test, typecheck, and lint participants | Standard pre-PR verification; excludes formatting debt, `lint:fix`, and `test:e2e`. |
| `pnpm test:e2e` | `api` | Run database-backed API E2E tests separately from standard verification. |

Packages without an applicable check will be omitted rather than given placeholder or no-op scripts. `pnpm test:e2e` will document its local Postgres, migration, seed, and test-environment prerequisites and remain outside `pnpm verify`. Provider-dependent and slow tests also remain separate from the standard local verification path.

## Package scripts and CI

- The API will make `lint` non-mutating, move fix behavior to explicit `lint:fix`, baseline existing violations through reviewed ESLint bulk suppressions, and expose deterministic CI unit-test semantics.
- Web and mobile will expose explicit type-check and lint-check scripts.
- Shared contracts will use build/type-check validation and will no longer contain a failing test placeholder.
- Vision will expose one package script for its four existing fast smoke tests; no TypeScript script will be added.
- GitHub Actions will call package scripts rather than invoking Jest or individual Python files directly where a package script is the canonical interface.
- `CONTRIBUTING.md` will document every root command, package participation, E2E prerequisites, and the boundary for provider-dependent tests.

## Failure and safety behavior

Commands will execute through pnpm filters so failures identify the package and script. Standard verification will stop on the first failed stage, preserving the earliest actionable error. No command included by `verify` will use `--fix`, write formatting changes, reset data, or invoke provider-dependent services. Fixing remains an explicit opt-in operation through `lint:fix` or the existing formatter command.

## Verification

The completed change must run, from the repository root:

1. `pnpm build`
2. `pnpm test`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm verify`

`pnpm format:check` will also be executed and reported, but existing repository-wide formatting debt will not make the standard pre-PR gate permanently red.

Before and after these commands, the implementation will capture `git status --short` in the issue worktree and confirm validation introduced no tracked source or configuration changes. All validation runs only in `C:\Users\akuma\repos\cart-generator-issue-84`. The original worktree's existing `apps/web/public/manifest.json` and `apps/web/public/site.webmanifest` changes will be compared before and after and preserved unchanged.

The delivery branch starts cleanly from `origin/main`, uses the repository's semantic commit format, is pushed without merging, and remains limited to issue #84. The final report will map evidence to every acceptance criterion and identify database-backed E2E or provider-dependent validation that remains intentionally separate.
