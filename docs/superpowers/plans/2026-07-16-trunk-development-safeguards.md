# Trunk Development Safeguards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Preppie's production-trunk workflow explicit and enforce its documented semantic commit convention locally and in pull-request CI.

**Architecture:** Keep workflow policy in `CONTRIBUTING.md` and `docs/branching.md`, with `main` as the only permanent production trunk. Add repository-root Commitlint configuration, a Husky `commit-msg` hook for immediate feedback, and a standalone GitHub Actions check that validates the complete pull-request commit range without modifying files.

**Tech Stack:** pnpm 11, Node.js 22, Commitlint, Husky 9, GitHub Actions, Markdown.

## Global Constraints

- Work from a clean short-lived branch based on `origin/main`; do not modify the user's local `manifest.json` or `site.webmanifest` changes.
- Do not edit `RULES.md`; reconciling it and removing active `demo/2` guidance belongs to #72.
- Do not introduce campus-first product framing.
- Keep all validation non-mutating.
- Do not treat `vision-lab` as TypeScript.
- Do not create a permanent `dev`, `staging`, or `integration` branch.

---

## File Map

- Create `commitlint.config.cjs`: extend the conventional preset and restrict accepted types to the repository's documented semantic types.
- Create `.husky/commit-msg`: run the repository-local Commitlint CLI against the proposed commit message.
- Create `.github/workflows/commitlint.yml`: validate every commit introduced by a pull request and the pushed commit on `main`.
- Modify `package.json`: add Commitlint dependencies and non-mutating root commands.
- Modify `pnpm-lock.yaml`: lock the new development dependencies.
- Modify `CONTRIBUTING.md`: define the canonical trunk workflow, temporary integration lifecycle, hotfix path, commit rules, checks, and deployment sources.
- Modify `docs/branching.md`: align the detailed branch policy and correct `galo/*` to `gallo/*`.
- Create `docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md`: record the approved design and #71/#72 boundary.

### Task 1: Add deterministic commit-message validation

**Files:**
- Create: `commitlint.config.cjs`
- Create: `.husky/commit-msg`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the semantic types already documented in `CONTRIBUTING.md`.
- Produces: `pnpm commitlint --edit <path>` for hooks and `pnpm commitlint --from <sha> --to <sha>` for CI.

- [ ] **Step 1: Install the official Commitlint CLI and conventional preset**

Run:

```powershell
pnpm add -Dw @commitlint/cli @commitlint/config-conventional
```

Expected: `package.json` and `pnpm-lock.yaml` add compatible Commitlint packages; no package source files change.

- [ ] **Step 2: Add the root configuration and script**

Create `commitlint.config.cjs`:

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'ci'],
    ],
  },
};
```

Add this non-mutating script to `package.json`:

```json
"commitlint": "commitlint"
```

- [ ] **Step 3: Verify valid and invalid messages directly**

Run:

```powershell
"ci(repo): enforce semantic commits" | pnpm commitlint
"updated stuff" | pnpm commitlint
```

Expected: the first command exits `0`; the second exits non-zero with `subject-empty` and `type-empty` errors.

- [ ] **Step 4: Add local Husky feedback**

Create `.husky/commit-msg`:

```sh
pnpm commitlint --edit "$1"
```

Run:

```powershell
$validMessage = New-TemporaryFile
Set-Content -LiteralPath $validMessage -Value 'chore(repo): test commit hook'
$gitPath = (Get-Command git).Source
$gitRoot = Split-Path (Split-Path $gitPath -Parent) -Parent
& (Join-Path $gitRoot 'bin\sh.exe') .husky/commit-msg $validMessage
Remove-Item -LiteralPath $validMessage
```

Expected: the hook exits `0` and does not modify tracked files.

- [ ] **Step 5: Commit the independently working validator**

```powershell
git add package.json pnpm-lock.yaml commitlint.config.cjs .husky/commit-msg
git commit -m "ci(repo): enforce semantic commit messages"
```

Expected: the new hook validates the commit message and the commit succeeds.

### Task 2: Enforce pull-request and production commit ranges in CI

**Files:**
- Create: `.github/workflows/commitlint.yml`

**Interfaces:**
- Consumes: `pnpm commitlint` and the full Git history from `actions/checkout`.
- Produces: a `Commitlint / commitlint` status check suitable for branch protection.

- [ ] **Step 1: Add the standalone workflow**

Create `.github/workflows/commitlint.yml`:

```yaml
name: Commitlint

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Validate pull request commits
        if: github.event_name == 'pull_request'
        run: pnpm commitlint --from "${{ github.event.pull_request.base.sha }}" --to "${{ github.event.pull_request.head.sha }}" --verbose

      - name: Validate pushed commit
        if: github.event_name == 'push'
        run: pnpm commitlint --last --verbose
```

- [ ] **Step 2: Validate workflow syntax and the real branch range locally**

Run:

```powershell
pnpm exec prettier --check .github/workflows/commitlint.yml commitlint.config.cjs package.json
pnpm commitlint --from origin/main --to HEAD --verbose
git diff --check
```

Expected: all commands exit `0`; `git status --short` shows no validation-generated changes.

- [ ] **Step 3: Commit the CI enforcement**

```powershell
git add .github/workflows/commitlint.yml
git commit -m "ci(repo): validate pull request commit ranges"
```

Expected: the local `commit-msg` hook accepts the semantic commit and the workflow is isolated from package build/test jobs.

### Task 3: Document the trunk policy and safeguards

**Files:**
- Create: `docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/branching.md`

**Interfaces:**
- Consumes: the root verification contract from #84 and the Commitlint behavior from Tasks 1-2.
- Produces: the canonical human and agent-facing workflow for #71; `RULES.md` remains explicitly assigned to #72.

- [ ] **Step 1: Record the approved design**

Create the design document with these explicit decisions:

```markdown
# Trunk Development Safeguards Design

- `main` is the shared baseline and only production trunk.
- Work branches are short-lived, start from current `main`, and return through PRs.
- Vercel branch/PR deployments are previews; Vercel and Railway production deployments originate from `main`.
- `staging/*` and `integration/*` are temporary tools for named integration exercises, with an owner, inputs, exit criteria, and retirement date.
- Hotfixes start from and return to `main` through focused PRs.
- Commitlint enforces the documented semantic convention locally and across the full PR commit range in CI.
- #72, not #71, reconciles `RULES.md` and active `demo/2` references.
```

- [ ] **Step 2: Expand the contributor contract**

Update `CONTRIBUTING.md` to document:

- creating short-lived branches from an up-to-date `main`
- PRs targeting `main` and branch freshness before merge
- required root and relevant package checks
- preview versus production deployment sources
- temporary integration branch naming, owner, inputs, exit criteria, and retirement
- focused hotfix PRs into `main`
- accepted Commitlint types, optional lowercase scopes, examples, and local/CI commands
- merge strategy implications: every PR commit is validated today; if the repository later requires squash-only merges, the PR title must become the validated final commit title

- [ ] **Step 3: Align the detailed branch policy**

Update `docs/branching.md` so it:

- uses `gallo/*`, never `galo/*`
- says `dev` and `demo/*` are not normal bases or targets
- specifies the complete lifecycle for temporary `staging/*` and `integration/*` branches
- identifies `main` branch protection and successful checks as merge safeguards
- points commit rules back to `CONTRIBUTING.md`
- leaves `RULES.md` untouched for #72

- [ ] **Step 4: Validate documentation without rewriting it**

Run:

```powershell
pnpm exec prettier --check CONTRIBUTING.md docs/branching.md docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md
rg -n "galo/|campus-first|demo/2.*default|merge into dev|branch from dev" CONTRIBUTING.md docs/branching.md docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md
git diff --check
```

Expected: Prettier and `git diff --check` exit `0`; `rg` returns no matches.

- [ ] **Step 5: Commit the canonical documentation**

```powershell
git add CONTRIBUTING.md docs/branching.md
git add -f docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md docs/superpowers/plans/2026-07-16-trunk-development-safeguards.md
git commit -m "docs(repo): formalize trunk development safeguards"
```

Expected: the hook accepts the message and the commit includes no `RULES.md` change.

### Task 4: Verify #71 end to end and prepare the PR

**Files:**
- Verify only; modify earlier files only if validation exposes a scoped defect.

**Interfaces:**
- Consumes: all deliverables from Tasks 1-3.
- Produces: evidence mapped to every #71 acceptance criterion.

- [ ] **Step 1: Install exactly from the lockfile**

Run:

```powershell
pnpm install --frozen-lockfile
```

Expected: exit `0` and no lockfile change.

- [ ] **Step 2: Run commit-specific checks**

Run:

```powershell
pnpm commitlint --from origin/main --to HEAD --verbose
pnpm exec prettier --check commitlint.config.cjs package.json .github/workflows/commitlint.yml CONTRIBUTING.md docs/branching.md docs/superpowers/specs/2026-07-16-trunk-development-safeguards-design.md docs/superpowers/plans/2026-07-16-trunk-development-safeguards.md
git diff --check
```

Expected: all commands exit `0` and do not modify tracked files.

- [ ] **Step 3: Run the complete non-mutating repository verification**

Run:

```powershell
pnpm verify
```

Expected: lint, typecheck, unit/smoke tests, and builds pass for the packages defined by #84; `vision-lab` participates in its own tests/build but not TypeScript validation.

- [ ] **Step 4: Confirm scope and history**

Run:

```powershell
git status --short --branch
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
```

Expected: only #71 files are present, all commits pass Commitlint, and `RULES.md`, `manifest.json`, and `site.webmanifest` are absent from the diff.

- [ ] **Step 5: Push and open a PR without merging**

```powershell
git push -u origin piero/trunk-development-safeguards
```

Prepare a PR into `main` with the required sections: what changed, risky areas, commands run, and remaining issues. Link `Closes #71`, call out that branch-protection selection is a GitHub repository setting, and leave #72 pending.

## Self-Review

- Spec coverage: every #71 acceptance criterion maps to Tasks 1-4.
- Scope boundary: `RULES.md`, environment provisioning, branch deletion, and product copy are excluded.
- Placeholder scan: the plan contains exact files, commands, expected outcomes, and configuration content.
- Interface consistency: local hooks and CI both invoke the same root `commitlint` script and configuration.
