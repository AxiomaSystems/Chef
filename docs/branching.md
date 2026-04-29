# Branch Audit - 2026-04-29

This note is a practical branch map for the current repo state. It is not a long-term Git policy document. The goal is to help the team stop guessing which branch matters.

## Current Recommendation

Use `piero/demo2` as the working integration branch for the current demo/deploy line.

Why:
- local `piero/demo2` and local `demo/2` point to the same commit
- `origin/demo/2` contains the deploy-ready work that is already running in Vercel and Railway
- most remote branches are already fully contained in `origin/demo/2`

## What The Branches Mean Right Now

### Active baseline

- `piero/demo2`
  - local branch only right now
  - points at the same commit as `demo/2`
  - recommended branch to push and keep as the main team integration line for the demo

- `demo/2`
  - current deploy-ready integration branch
  - already contains the work from `main`, `demo/1`, `ft-frontend-ui`, `ft-llm`, `enoch/voice-integration`, and `piero/demo-backend/1`

### Older branches now mostly superseded

- `demo/1`
  - old demo integration branch
  - fully contained in `demo/2`

- `piero/demo-backend/1`
  - old backend-focused branch
  - fully contained in `demo/2`

- `ft-frontend-ui`
  - fully contained in `demo/2`

- `ft-llm`
  - fully contained in `demo/2`

- `enoch/voice-integration`
  - despite the name, the remote branch is currently fully contained in `demo/2`

- `main`
  - remote `main` is behind `demo/2`
  - treat it as stale for the demo line until the team intentionally merges the demo branch back

### Branch that is still genuinely separate

- `ft-yolo_galo`
  - not contained in `demo/2`
  - includes a large vision/YOLO spike
  - adds `apps/vision-lab`, `vision` API files, docs, shared vision types, and a model file
  - this branch should be reviewed intentionally, not auto-deleted

## Simple Read On The Repo

At the moment the repo is not suffering from "many independent product lines". It is suffering from:

- duplicate integration branch names
- stale legacy branch names still hanging around
- one still-diverged experimental branch (`ft-yolo_galo`)

That is a manageable cleanup.

## Team Alignment Plan

### 1. Pick one integration branch name

Recommended:
- keep using `piero/demo2`

Then:
- push `piero/demo2`
- tell the team to branch from `piero/demo2`
- stop using `demo/1`, `demo/2`, and `piero/demo-backend/1` for new work

### 2. Ask everyone to push local-only work immediately

Message to send:

```text
Please push any local-only work today, even if it is messy or incomplete.
Use a branch name that starts with your name, for example:

  enoch/<short-topic>
  galo/<short-topic>
  ahmad/<short-topic>
  piero/<short-topic>

If your work is exploratory, still push it. We need visibility first, cleanup second.
```

### 3. Freeze branch creation rules

Use only these categories:
- `main` for stable shared baseline
- `piero/demo2` for current demo integration
- `<person>/<topic>` for active individual work
- `spike/<topic>` for experiments that may never merge

Avoid:
- `demo/1`, `demo/2`, `demo/3`
- `ft-*` without ownership
- branch names that encode temporary history instead of responsibility

### 4. Review `ft-yolo_galo` explicitly

Before merging or deleting it, decide:
- is vision part of the next demo scope?
- does `apps/vision-lab` belong in this repo?
- do we want the `vision` API surface now, or later?

If yes:
- rebase or merge it onto `piero/demo2`
- open a focused integration PR

If no:
- leave it as a spike branch
- do not mix it into the deploy branch yet

### 5. Clean up after local pushes are visible

Once everyone has pushed local-only work and the team has reviewed it:
- archive or delete `demo/1`
- archive or delete `piero/demo-backend/1`
- archive or delete `ft-frontend-ui`
- archive or delete `ft-llm`
- archive or delete `enoch/voice-integration`

Only do this after confirming no one still depends on them locally.

## Immediate Command Checklist

For you:

```powershell
git checkout piero/demo2
git push -u origin piero/demo2
```

For each teammate:

```powershell
git status
git branch
git push -u origin <their-current-branch>
```

If they have detached or messy local work:

```powershell
git checkout -b <name>/<topic>
git push -u origin <name>/<topic>
```

## Bottom Line

Today there is one real integration line and one real divergent experiment:

- integration line: `piero/demo2` / `demo/2`
- divergent experiment: `ft-yolo_galo`

Everything else looks like legacy naming or already-absorbed work.
