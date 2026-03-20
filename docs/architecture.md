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
- what is implemented but still transitional

## Current Implemented Flow

Today the backend can already do this:

```text
Visible recipes
  -> Cart draft persistence
  -> User selection
  -> Cart persistence
  -> Dish expansion
  -> Ingredient aggregation
  -> Product matching (mock catalog)
  -> Cost estimation
  -> Persisted shopping cart
```

That flow is implemented in the NestJS API under:

```text
apps/api/src/
|-- auth/
|-- cuisines/
|-- tags/
|-- recipe/
|-- cart/
|-- aggregation/
|-- matching/
|-- user/
|-- prisma/
`-- common/http/
```

## Current Conceptual Flow

The implemented model is:

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

- this concept is now explicit in API, persistence, and shared types
- `Cart` is no longer collapsed into the generated shopping output

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

Implemented responsibilities:

- link to a parent `Cart`
- preserve the aggregated overview snapshot
- preserve matched products and selected quantities
- preserve retailer and estimated subtotal

Current status:

- this is now represented explicitly as `ShoppingCart`
- retailer matching still uses a mock provider boundary

## Current Access Model

The current API now has real auth plus a temporary development fallback.

Current behavior:

- unauthenticated recipe reads expose only global system recipes
- authenticated users can read global recipes plus their own recipes
- mutable recipe endpoints require authentication
- drafts and generated shopping results are always user-scoped
- `/api/v1/me` is the authenticated profile boundary
- `/api/v1/auth/*` provides register, login, Google login, refresh, and logout

Current transitional auth setup:

- JWT access tokens are the primary authenticated path
- refresh tokens are persisted and rotated
- `User` is the ownership root
- `AuthIdentity` stores provider-linked identities
- `RefreshToken` stores hashed refresh tokens

Temporary development fallback:

- `x-user-id`
- accepts seeded user id or seeded user email

This header is still accepted as a temporary development fallback for local development and backward compatibility, but the web app no longer depends on it.

## Live API Shape

The internal API now lives under `/api/v1`.

Implemented route families:

- `/api/v1/recipes`
- `/api/v1/recipe-forks`
- `/api/v1/cart-drafts`
- `/api/v1/carts`
- `/api/v1/shopping-carts`

Implemented mapping:

- `POST /api/v1/recipe-forks` replaces the older save-style command route
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

## Next Layers

### 1. Client Migration And Auth Hardening

Purpose:

- harden the client integration now that the first bearer-token web slice is in place
- remove the remaining temporary development fallback from backend flows and documentation

Current implemented direction:

- authenticated user context through JWT bearer tokens
- `/me` profile surface
- persisted refresh-token rotation
- linked auth identities per user

Current status:

- email/password auth is implemented
- Google token login backend is implemented
- refresh/logout are implemented
- `/me` is implemented
- `PATCH /me` is implemented
- `/me/preferences` is implemented for cuisine and system-tag preferences
- `/me/onboarding/complete` is implemented
- the web app now uses bearer-token auth for its dashboard flow
- backend fallback removal is still pending

### 2. Hybrid Tags And Controlled Cuisine

Purpose:

- support shared taxonomy plus private user organization

Status:

- explicit `Tag` and `RecipeTag` persistence is implemented
- `/api/v1/tags` is implemented
- recipes now accept `tag_ids` on write and return expanded `tags` on read
- explicit `Cuisine` persistence is implemented
- `/api/v1/cuisines` is implemented
- recipes now require `cuisine_id` on write and return expanded `cuisine` on read

### 2.5. Onboarding State

Purpose:

- distinguish "preferences are empty" from "the user has not completed onboarding yet"

Status:

- onboarding completion is tracked separately on `User`
- `/api/v1/me/onboarding/complete` is implemented
- the web app now routes incomplete users into a required onboarding flow

### 3. Real Retailer Provider

Purpose:

- replace mock matching behind the `ShoppingCart` boundary without redesigning cart resources

Status:

- the resource boundary is already in place
- the current provider is still mock-based

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

1. read this file for implemented architecture and transitional boundaries
2. read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for policy and API-shape decisions
3. read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual vocabulary
4. read Swagger at `/docs` for the live implemented `/api/v1` contract
