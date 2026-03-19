# Architecture - Cart Generator

## Overview

Cart Generator is a layered system that transforms:

```text
user-visible recipes + selections + constraints -> structured grocery cart
```

The core design principle is still the same:

- keep the center of the system stateful and deterministic
- use AI only for constrained transformations, not for core arithmetic or pricing logic

This document now separates what is already implemented from what is still planned.

## Current Implemented Flow

Today the backend can already do this:

```text
Visible recipes
  -> User selection
  -> Dish expansion
  -> Ingredient aggregation
  -> Product matching (mock catalog)
  -> Cost estimation
  -> Generated cart
  -> Cart persistence
```

That flow is implemented in the NestJS API under:

```text
apps/api/src/
|-- recipe/
|-- cart/
|-- aggregation/
|-- matching/
|-- user/
|-- prisma/
`-- common/http/
```

## Current System Layers

### 1. Recipe Layer

Purpose:

- store stable recipes
- separate global catalog recipes from user-owned recipes
- support editable user forks of system recipes

Implemented entities:

- `BaseRecipe`
- `DishIngredient`
- `RecipeStep`

Implemented rules:

- system recipes are global and immutable
- user-created recipes are private by default
- saving a system recipe creates a user-owned editable fork
- duplicate forks of the same source recipe are prevented per user

### 2. Selection Layer

Purpose:

- capture user intent for a specific plan or shopping session

Implemented entities:

- `CartDraft`
- `SelectedRecipe`

Current status:

- draft persistence exists
- selection is request-driven and draft-driven
- there is no dedicated UI flow yet

### 3. Aggregation Layer

Purpose:

- merge selected dishes into one consolidated ingredient overview

Implemented rules:

- deterministic only
- no AI involvement
- ingredients are grouped by canonical ingredient + unit
- dish provenance is preserved in the aggregated output

Implemented entity:

- `AggregatedIngredient`

### 4. Product Matching Layer

Purpose:

- map ingredient needs to mock purchasable products

Implemented behavior:

1. generate a search query from canonical ingredient data
2. score candidates from a mock catalog
3. account for unit compatibility and basic conversion
4. pick a product and quantity
5. compute line totals and subtotal

Implemented entities:

- `ProductCandidate`
- `MatchedIngredientProduct`

Current limitation:

- matching is still mock-catalog based, not a real retailer integration

### 5. Cart Layer

Purpose:

- return and persist the final structured cart

Implemented entities:

- `GeneratedCart`
- `CartDraft`

Implemented endpoints:

- `POST /cart/generate`
- `POST /cart/drafts`
- `GET /cart/drafts`
- `GET /cart/drafts/:id`
- `GET /cart/generated`
- `GET /cart/generated/history`
- `GET /cart/generated/:id`

## Current Access Model

The current API uses a development identity header and explicit ownership rules.

Current behavior:

- unauthenticated recipe reads only expose global system recipes
- authenticated users can read global recipes plus their own recipes
- mutable endpoints require authentication
- drafts and generated carts are always user-scoped

Current development identity:

- `x-user-id`
- accepts seeded user id or seeded user email

This is temporary developer auth context, not final authentication architecture.

## Current API Shape

Implemented recipe endpoints:

- `POST /recipes`
- `GET /recipes`
- `GET /recipes/:id`
- `GET /recipes/:id/origin`
- `PATCH /recipes/:id`
- `POST /recipes/:id/save`
- `DELETE /recipes/:id`

Implemented cart service flow:

```text
request
  -> CartService
  -> RecipeService
  -> AggregationService
  -> MatchingService
  -> cart persistence
  -> response
```

Swagger/OpenAPI is available at:

- `/docs`
- `/docs/openapi.json`

## Current State Boundaries

Persistent state:

- users
- base recipes
- dish ingredients
- recipe steps
- cart drafts
- generated carts

Derived but persisted state:

- generated cart dishes
- aggregated ingredient overviews
- matched cart items
- estimated subtotal

Ephemeral state:

- request-scoped actor context
- request-scoped request id
- intermediate matching candidates during computation

Not implemented yet:

- recipe variants
- raw LLM outputs
- async matching jobs

## Current Infrastructure

Implemented local services:

- PostgreSQL for persistence
- Docker for local orchestration
- Prisma for schema, migrations, and client generation

Implemented supporting infrastructure:

- Swagger/OpenAPI
- request logging with `x-request-id`
- Postman collection for manual API testing

Not implemented yet:

- Redis
- background jobs
- real external retailer integration
- OpenAI integration

## Planned Next Layers

### 1. Adaptation Layer

Purpose:

- transform a base recipe under explicit constraints without replacing the original

Examples:

- cheaper
- halal
- vegan
- calorie-adjusted

Planned entities:

- `RecipeVariant`
- `RecipeAdaptationRequest`

Status:

- shared types exist
- runtime implementation does not exist yet

### 2. Better Normalization

Purpose:

- make aggregation and matching more robust

Planned responsibilities:

- stronger canonical ingredient naming
- richer unit normalization and conversion
- better ingredient interpretation

Status:

- partially implemented today
- still incomplete

### 3. Real Authentication

Purpose:

- replace dev header identity with real user auth

Planned direction:

- authenticated user context
- role-aware admin behavior
- proper ownership enforcement without relying on manual headers

### 4. Hybrid Tags

Purpose:

- support shared taxonomy plus private user organization

Status:

- currently `tags` are `string[]`
- future model should support both system and user-scoped tags

## Design Rules

- deterministic logic for aggregation, matching, and pricing
- AI only for constrained transformations
- explicit module boundaries
- structured data over free text
- shared contracts across apps
- system recipes remain immutable
- user-owned data is isolated by default

## Practical Reading Guide

If you want the current truth of the system:

1. read this file for implemented vs planned architecture
2. read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for policy and modeling decisions
3. read [apps/api/README.md](/C:/Users/akuma/repos/cart-generator/apps/api/README.md) for the real runnable backend surface
4. read Swagger at `/docs` for the live API contract
