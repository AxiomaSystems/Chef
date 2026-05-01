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

Agents should prefer boring, correct, well-integrated code over flashy or overbuilt output.

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
