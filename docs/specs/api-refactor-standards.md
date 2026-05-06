# API Refactor And Standards Spec

Owner: backend

Status: approved working spec for incremental adoption

## Goal

Define stable API design rules for Chef so new endpoints are easier to review, more REST-consistent, and safer to scale.

This spec is intentionally split into:

1. **standards for all new or changed endpoints**
2. **phase 2 migration ideas** for existing endpoints that do not fully match the target style

The goal is to reduce API drift without forcing a risky route rewrite during backend stabilization.

## Scope

Applies to:

- new REST endpoints
- refactors of existing endpoints
- request/response contract changes
- error-response design for launch-critical flows

Does not require immediate renaming of all existing endpoints.

## Core API Standards

### 1. Prefer resource-oriented routes

Use nouns for resources and HTTP methods for actions.

Preferred:

- `GET /api/v1/recipes`
- `POST /api/v1/recipes`
- `GET /api/v1/recipes/:id`
- `PATCH /api/v1/recipes/:id`
- `DELETE /api/v1/recipes/:id`

Avoid introducing new action-style endpoints unless the route represents a true workflow rather than a resource.

### 2. Use nested routes only for real ownership/context

Good nesting examples:

- `/api/v1/carts/:id/ingredient-review`
- `/api/v1/carts/:cartId/shopping-carts`

Use nesting when the child resource only makes sense through the parent.

### 3. Keep controller roots readable

Prefer controller bases like:

- `@Controller('api/v1/recipes')`
- `@Controller('api/v1/retailers')`

Avoid expanding generic `@Controller('api/v1')` controllers with unrelated route families unless there is a strong reason.

### 4. Match HTTP semantics cleanly

- `GET`: read
- `POST`: create or non-idempotent workflow
- `PUT`: replace/upsert full structured state
- `PATCH`: partial update
- `DELETE`: remove

If an endpoint is a workflow command rather than a resource mutation, document that exception in Swagger and relevant specs.

### 5. Contracts must be wired through all layers

If an endpoint request/response changes, update:

- DTOs
- service logic
- `packages/shared`
- Swagger DTOs/examples when relevant
- targeted tests

## Error Contract Standards

### 1. Messages should be UI-usable

For launch-critical flows, backend errors should be understandable without extra translation.

Examples:

- `Set your shopping location first before using Kroger search.`
- `Kroger search is unavailable because provider credentials are missing.`
- `Instacart handoff is unavailable because provider credentials are missing.`

### 2. Add stable `code` values gradually for critical flows

Current error format is usable but basic. For critical API flows, the target shape should evolve toward:

```json
{
  "statusCode": 503,
  "message": "Instacart handoff is unavailable because provider credentials are missing.",
  "error": "Service Unavailable",
  "code": "provider_missing_credentials"
}
```

Initial recommended codes:

- `shopping_location_required`
- `provider_missing_credentials`
- `provider_not_configured`
- `provider_unavailable`

This should be introduced incrementally, not via a sweeping refactor.

## Accepted Exceptions

The following patterns are acceptable when explicitly documented:

- auth command endpoints like `/api/v1/auth/login`
- workflow endpoints like `/api/v1/me/onboarding/complete`
- special command-like endpoints such as cart restock creation

When using an exception, prefer:

- clear naming
- strong Swagger description
- targeted tests

## Current Surface Review

### Strong areas

- versioning is consistent under `/api/v1`
- most CRUD routes are resource-oriented
- nested cart routes are mostly sensible
- health/readiness endpoints now support operability

### Current inconsistencies to track

- some controllers still mount from `@Controller('api/v1')` and expose multiple route families
- `GET /api/v1/retailers/:retailer/products/search` is usable, but not the cleanest long-term resource shape
- `GET /api/v1/shopping-carts/history` behaves more like a filtered projection than a separate top-level concept
- workflow routes under `me` and `carts` are acceptable but should remain documented exceptions

## Phase 2 Migration Candidates

These are candidates, not immediate required changes.

### Candidate 1: retailer product search route

Current:

- `GET /api/v1/retailers/:retailer/products/search?query=...`

Possible future alternatives:

- keep as-is and explicitly standardize it as a search projection
- move toward a collection style like `/api/v1/retailers/:retailer/products?query=...`

Recommendation: keep current route for now, document it as an accepted search exception.

### Candidate 2: shopping cart history

Current:

- `GET /api/v1/shopping-carts/history`

Possible future alternatives:

- keep as a summary/history view
- evolve toward queryable projections on `/api/v1/shopping-carts`

Recommendation: keep current route during stabilization; revisit only if consumer complexity grows.

### Candidate 3: generic `api/v1` controllers

Current:

- some route families live under broad controller roots

Recommendation: new route families should get their own resource controller base. Existing broad controllers can be split gradually when touched.

## Standards For Future Endpoint Work

Before adding or changing endpoints, contributors should ask:

1. Is this a resource or a workflow?
2. If it is a workflow, is the exception documented clearly?
3. Does the route fit the existing resource hierarchy?
4. Are request/response contracts reflected in shared types and Swagger?
5. Does the error response give the frontend something actionable?

## AGENTS.md Update Intent

`AGENTS.md` should explicitly require agents to use API design guidance when creating or redesigning endpoints.

Recommended rule:

- use the `api-design-principles` skill for endpoint creation or API route redesign
- avoid introducing new inconsistent route shapes without documenting the exception
- prefer incremental migration over broad breaking endpoint rewrites during stabilization work

## Recommended Next Step

Use this spec as the standard for:

1. remaining Week 7 backend work
2. future endpoint additions
3. later API cleanup after user-testing stabilization

Short term: continue with runtime stabilization and CI using these rules.

Long term: treat phase 2 migration items as deliberate API cleanup work, not opportunistic edits.