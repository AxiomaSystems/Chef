# Architecture - Cart Generator

## Overview

Cart Generator is a layered system that transforms:

```text
visible recipes + user selections + constraints -> meal plan cart -> shopping cart
```

The core design principles remain the same:

- keep the center of the system stateful and deterministic
- use AI only for constrained transformations, not for core arithmetic, matching, or pricing

This document distinguishes:

- what is implemented today
- what is the approved next API direction

## Current Implemented Flow

Today the backend can already do this:

```text
Visible recipes
  -> User selection
  -> Dish expansion
  -> Ingredient aggregation
  -> Product matching (mock catalog)
  -> Cost estimation
  -> Persisted generated cart
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

## Approved Conceptual Flow

The approved model for the next refactor is:

```text
Recipe
  -> CartDraft
  -> Cart
  -> ShoppingCart
```

Interpretation:

- `CartDraft` captures editable user intent
- `Cart` is the stable recipe-based meal-plan snapshot
- `ShoppingCart` is the derived retailer-facing purchase basket

This split is important because:

- recipes and meal planning belong to the culinary domain
- shopping-cart generation belongs to the retail resolution domain
- one `Cart` should be able to produce one or more `ShoppingCart` snapshots over time

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

- capture user intent for a specific meal-planning session

Implemented entities:

- `CartDraft`
- `SelectedRecipe`

Current status:

- draft persistence exists
- selection is currently request-driven and draft-driven
- there is no dedicated UI flow yet

### 3. Cart Layer

Purpose:

- represent the meal-plan snapshot derived from recipe selections

Approved responsibilities:

- hold recipe selections
- hold resolved dishes and servings context
- remain independent from retailer matching details

Current status:

- this concept is only partially explicit today
- some current endpoints collapse `Cart` and `ShoppingCart` into one generated-cart concept

### 4. Aggregation Layer

Purpose:

- merge dish ingredients into one consolidated overview

Implemented rules:

- deterministic only
- no AI involvement
- ingredients are grouped by canonical ingredient + unit
- dish provenance is preserved in the aggregated output

Implemented entity:

- `AggregatedIngredient`

### 5. Product Matching Layer

Purpose:

- map aggregated ingredient needs to purchasable products

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

### 6. Shopping Cart Layer

Purpose:

- persist the retailer-facing purchase basket derived from a `Cart`

Approved responsibilities:

- link to a parent `Cart`
- preserve the aggregated overview snapshot
- preserve matched products and selected quantities
- preserve retailer and estimated subtotal

Current status:

- this is currently represented as a generated-cart concept
- the approved direction is to rename and model it explicitly as `ShoppingCart`

## Current Access Model

The current API uses a development identity header and explicit ownership rules.

Current behavior:

- unauthenticated recipe reads expose only global system recipes
- authenticated users can read global recipes plus their own recipes
- mutable recipe endpoints require authentication
- drafts and generated shopping results are always user-scoped

Current development identity:

- `x-user-id`
- accepts seeded user id or seeded user email

This is temporary developer auth context, not final authentication architecture.

## Approved API Shape

The next internal API should live under `/api/v1`.

Approved route families:

- `/api/v1/recipes`
- `/api/v1/recipe-forks`
- `/api/v1/cart-drafts`
- `/api/v1/carts`
- `/api/v1/shopping-carts`

Approved mapping:

- `POST /api/v1/recipe-forks` replaces the current save/fork command route
- `POST /api/v1/carts` creates the meal-plan snapshot
- `POST /api/v1/carts/:cartId/shopping-carts` derives a purchase basket from a cart

This keeps retailer integration behind the shopping-cart boundary instead of coupling it directly to recipe selection endpoints.

## Current State Boundaries

Persistent state today:

- users
- base recipes
- dish ingredients
- recipe steps
- cart drafts
- generated carts

Approved persistent state direction:

- users
- base recipes
- dish ingredients
- recipe steps
- cart drafts
- carts
- shopping carts

Derived but persisted shopping state:

- resolved dishes
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
- real retailer provider integration

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

### 1. Internal API v1 Refactor

Purpose:

- establish a clean internal contract before real auth and tag evolution

Scope:

- move to `/api/v1`
- make resource names explicit
- split `Cart` from `ShoppingCart`
- align status codes and error semantics

### 2. Real Authentication

Purpose:

- replace dev header identity with real user auth

Planned direction:

- authenticated user context
- `/me` profile surface
- role-aware admin behavior
- proper ownership enforcement without relying on manual headers

### 3. Hybrid Tags And Controlled Cuisine

Purpose:

- support shared taxonomy plus private user organization

Status:

- `tags` are still `string[]`
- `cuisine` is still a free string
- both should evolve after the `v1` API boundary is in place

### 4. Adaptation Layer

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

## Design Rules

- deterministic logic for aggregation, matching, and pricing
- AI only for constrained transformations
- explicit module boundaries
- structured data over free text
- shared contracts across apps
- system recipes remain immutable
- user-owned data is isolated by default
- retailer resolution belongs to `ShoppingCart`, not to `Cart`

## Practical Reading Guide

If you want the current truth of the system:

1. read this file for implemented vs approved-next architecture
2. read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for policy and API-shape decisions
3. read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual vocabulary
4. read Swagger at `/docs` for the live implemented contract until the `v1` refactor lands
