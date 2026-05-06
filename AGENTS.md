# AGENTS

This file defines expectations for AI agents contributing to Chef.

It is written for agent-assisted coding workflows used by the team. It applies whether the agent is generating code, reviewing code, refactoring, documenting, or preparing deploy work.

## Purpose

Agents are useful accelerators.

They are also good at producing:

- overly broad changes
- convincing but weak abstractions
- duplicated logic
- schema changes without full integration
- UI that looks plausible but is structurally poor

This file exists to keep agent output useful and reviewable.

## Core Rule

Agents may assist with implementation.

Agents do not own product decisions, architecture, or merge judgment.

The human operator remains responsible for:

- scope
- correctness
- verification
- ownership boundaries
- merge readiness

## What Agents Should Optimize For

Agent work in this repo should optimize for:

- narrow scope
- contract consistency
- testability
- maintainability
- explicit assumptions
- token efficiency

Agents should prefer boring, correct, well-integrated code over flashy or overbuilt output.

## Token Efficiency

Agents should stay compact and avoid re-reading or restating the same context.

Preferred behavior:

- use `rg` / `rg --files` first to narrow the search before opening files
- read only the files needed for the current task
- prefer entrypoints, touched files, diffs, and referenced docs over exploratory repo-wide reading
- read small slices first (`Get-Content -TotalCount`, targeted matches, nearby sections), then expand only if needed
- rely on the repo docs that already capture branch/process/setup state
- summarize long docs instead of quoting them back
- avoid broad repo scans unless the task truly needs them
- do not re-derive branch policy, local setup, or integration commands if the docs already cover them
- do not reopen the same long file repeatedly unless it changed or a new section is actually needed
- avoid reading generated files, build outputs, lockfiles, datasets, checkpoints, and dependency trees unless they are directly relevant

Default reading order:

1. search
2. smallest relevant doc or entrypoint
3. touched implementation files
4. tests
5. only then wider context if still blocked

For context-heavy tasks:

- prefer `README.md`, `local-dev-setup.md`, `docs/`, `docs/specs/`, `scripts/`, and `.github/workflows/` before scanning code broadly
- if one of those sources already answers the process/setup question, do not re-audit the entire repo
- if a repo-state audit is requested, focus on launch-critical or task-critical surfaces rather than trying to read everything

When investigating code:

- start from the calling file, route, script, or failing command
- trace outward only along the execution path
- prefer checking current branch diffs and recent commits over re-reading stable modules with no recent changes

When a task is about process, setup, architecture, or handoff context, prefer checking the relevant source directly:

- `README.md` for repo direction and high-level product context
- `local-dev-setup.md` for current local startup flow
- `docs/` for architecture, branching, handoffs, and current project status
- `docs/specs/` for approved specs and standards
- `scripts/` for local setup and automation entry points
- `.github/workflows/` for CI behavior

If a task is about process rather than code, start from the smallest relevant source instead of exploring the whole repo again.

## What Agents Are Allowed To Do

Agents may:

- implement small to medium scoped features
- refactor a focused module
- add DTOs, service logic, and tests
- update shared types
- update docs when contracts or flows change
- help with deploy configuration
- review diffs and identify risks

## What Agents Must Not Do Without Explicit Human Intent

Agents must not:

- merge unrelated work into one branch
- redesign a product flow without an approved spec
- add database fields that are not fully wired and justified
- touch another contributor’s active area casually
- replace normalized domain models with lower-quality convenience data
- silently change API contracts
- add speculative “future” code with no immediate use

## Branch Behavior

An agent should work inside one coherent branch scope.

If the branch is about onboarding backend, the agent should not also introduce:

- unrelated AI changes
- dashboard UI tweaks
- random import flows
- deploy changes

If unrelated work is discovered, the agent should:

- note it
- leave it alone
- or recommend a separate branch

## Schema and Migration Rules

If an agent changes `schema.prisma`, it must also ensure:

- a migration exists
- the generated client is updated
- consuming code is updated
- the change is tested against a real database path when practical

Schema-only changes are not acceptable output.

## API and Shared Contract Rules

If an agent changes API request or response behavior, it should also update:

- DTO validation
- service mapping
- shared types in `packages/shared`
- Swagger response DTOs or examples where relevant
- tests

Agents should not leave the frontend and backend with mismatched contract assumptions.

When creating new endpoints or redesigning existing endpoint routes, agents should use the `api-design-principles` skill and follow the API standards documented in `docs/specs/api-refactor-standards.md`.

Agents should prefer resource-oriented route design, document conscious exceptions, and avoid introducing new inconsistent endpoint shapes during stabilization work.

## UI Rules

Generated UI should be treated as draft-quality until reviewed by the frontend owner.

Agents should avoid:

- giant monolithic components
- hardcoded option walls in one file
- fake polish without structure
- overly verbose or messy generated copy

For onboarding or settings flows, agents should prefer:

- step structure
- reusable option groups
- predictable payload mapping
- maintainable state organization

## Verification Rules

Before presenting work as done, an agent should run the smallest relevant validation path it can.

Examples:

- backend change:
  - Prisma generate
  - API build
  - relevant tests

- shared contract change:
  - builds for affected consumers

- frontend change:
  - web build
  - targeted manual verification when needed

If verification could not be completed, the agent should say that explicitly.

## Documentation Rules

Agents should update docs when changing:

- schema or persistence behavior
- API contracts
- deploy flow
- user flow expectations

Docs should describe the real system, not what the agent intended to build.

## Review Posture

Agent-generated code should be reviewed with a skeptical engineering lens.

Reviewers should assume the code may contain:

- unnecessary complexity
- subtle contract drift
- incomplete edge cases
- structurally weak UI
- hidden scope creep

That skepticism is expected and healthy.

## Good Agent Output In This Repo

Good agent output looks like:

- small, readable diffs
- one coherent objective
- complete wiring across schema, service, shared types, and tests
- clear docs when contracts changed
- no surprise edits outside the claimed scope

## Bad Agent Output In This Repo

Bad agent output looks like:

- broad mixed-scope branches
- large generated UI with weak boundaries
- database changes without migrations
- API changes without shared-type updates
- “it compiles” with no runtime validation
- touching other people’s work without intent or coordination

## Default Team Policy

Use agents aggressively for speed.

Review their work conservatively for correctness.
