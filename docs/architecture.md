# Architecture - Chef

## Overview

Chef is a layered system that should transform food intent into executable meals.

```text
food idea or imported recipe
  -> structured recipe
  -> constraints and ingredient review
  -> meal plan cart
  -> retailer shopping cart
  -> cooking guidance
```

The core design principles remain the same:

- keep the center of the system stateful and deterministic
- use AI only for constrained transformations, not for core arithmetic, matching, or pricing
- treat external tools and MCPs as adapters behind internal provider interfaces
- keep the current frontend as a validation harness while backend/product contracts harden

This document distinguishes:

- what is implemented today
- what is implemented but still transitional
- what should be treated as future platform direction

The current web frontend should be considered a functional validation harness, not the final product interface. The architecture priority from here is to make the backend/API/tool contracts strong enough that a future frontend rebuild can sit on top cleanly.

## Startup Product Shape

The startup direction is broader than the current implemented vertical slice.

Long-term Chef should connect:

- meal idea generation
- recipe import/forking from outside content
- AI recipe editing
- calorie and macro tracking
- ingredient and kitchen inventory awareness
- retailer product matching
- editable grocery carts
- cart export/transfer
- live cooking assistance
- community recipe/cart forking

The near-term architecture should still stay focused on one wedge:

```text
meal idea or recipe -> structured ingredients -> remove what user has -> Kroger cart
```

## Current Implemented Flow

Today the backend can already do this:

```text
Visible recipes or user-provided meal idea
  -> Cart draft persistence
  -> User selection
  -> Cart persistence
  -> Dish expansion
  -> Ingredient aggregation
  -> Product matching (provider boundary, now live on Kroger)
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

The implemented model is currently:

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

The intended next flow adds recipe generation/import and ingredient review before cart creation:

```text
FoodIdea | ExternalRecipe | ExistingRecipe
  -> StructuredRecipe
  -> IngredientReview
  -> Cart
  -> ShoppingCart
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
- recipe reads can now carry optional `nutrition_data` as derived metadata without replacing structured ingredients
- recipe reads now also carry expanded tag metadata, so dietary badges can be represented as explicit `Tag.kind = dietary_badge`

Planned rules:

- generated recipes should land as structured recipe drafts/previews before persistence
- imported recipes should be normalized into the same recipe shape as native recipes
- AI recipe edits should create variants/forks or preview changes, not mutate source recipes silently

### 2. Selection Layer

Purpose:

- capture user intent for a specific meal-planning session

Implemented entities:

- `CartDraft`
- `SelectedRecipe`

Current status:

- draft persistence exists
- selection is currently draft-driven and cart-driven
- the main composer now lives in a large overlay that can create a draft, create a cart, or edit an existing draft/cart
- drafts are now treated as incomplete saved work, not the primary planning object

Planned status:

- pre-cart ingredient review should let users remove or adjust ingredients they already have before shopping-cart generation
- this is a lightweight first step toward inventory without requiring full pantry tracking

### 3. Cart Layer

Purpose:

- represent the meal-plan snapshot derived from recipe selections

Approved responsibilities:

- hold recipe selections
- hold retailer context for the planning run
- hold resolved dishes and servings context
- expose a derived aggregated ingredient overview from those dishes
- remain independent from retailer matching details

Current status:

- this concept is now explicit in API, persistence, and shared types
- `Cart` now persists `retailer` so the planning context survives draft -> cart -> shopping-cart generation
- cart reads now derive `overview` from persisted dishes instead of storing a second ingredient snapshot on the cart row
- `Cart` is no longer collapsed into the generated shopping output
- the web app now treats `Cart` as the primary planning artifact once a run is generated
- generating a cart from an existing draft should delete the draft so planning state does not duplicate itself

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

Current integration:

- cart overview reads can enrich aggregated ingredients with `in_kitchen`
- this enrichment uses the user's `KitchenInventoryItem` rows through the shared `Ingredient` catalog
- shopping-cart generation skips `in_kitchen` ingredients so retailer matching/export focuses on missing items

### 5. Product Matching Layer

Purpose:

- map aggregated ingredient needs to purchasable products

Implemented behavior:

1. generate a search query from canonical ingredient data
2. ask the active retailer provider for candidates
3. account for unit compatibility and basic conversion
4. pick a product and quantity
5. compute line totals and subtotal

Implemented entities:

- `ProductCandidate`
- `MatchedIngredientProduct`

Current limitation:

- matching now sits behind a provider boundary
- the default fallback provider is still the mock catalog
- Kroger is now the first live retailer path
- Walmart remains an optional provider boundary for later activation
- manual shopping-cart edits and per-line quantity editing now exist, but store-persistence UX and richer query rewriting still need work

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
- retailer matching now uses a provider boundary
- the fallback/default provider is mock
- Kroger can now resolve location + product search through the same contract
- Walmart can still be enabled later without changing the shopping-cart contract
- Instacart uses the cart-export boundary instead of the product-matching boundary, because its Developer Platform flow is better suited to hosted shopping-list handoff URLs
- `ShoppingCart.external_url` can store the generated external handoff URL
- `ShoppingCart.overview` preserves the ingredient-source snapshot, including which ingredients were already in the user's kitchen at generation time

### 7. Provider And Tool Layer

Purpose:

- isolate external systems from the core domain
- make retailer, nutrition, AI, and cart-export integrations replaceable
- allow MCPs or open-source tools to be evaluated without making them core architecture

Implemented today:

- retailer product provider boundary
- mock retailer provider
- Kroger live provider
- Walmart provider boundary
- Instacart cart-export provider
- retailer capability reporting through `/api/v1/retailers/capabilities`
- shared ingredient catalog and user kitchen inventory persistence

Planned provider categories:

- `RetailerProductProvider`
- `NutritionProvider`
- `RecipeImportProvider`
- `RecipeGenerationProvider`
- `RecipeEditingProvider`
- `CartExportProvider`
- `CookingAssistantToolProvider`

Design rule:

- external MCPs/tools can be adapters behind these interfaces
- they should not define persistence, API shape, or domain vocabulary directly

## Current Access Model

The current API now has real auth without a secondary dev actor path.

Current behavior:

- unauthenticated recipe reads expose only global system recipes
- authenticated users can read global recipes plus their own recipes
- mutable recipe endpoints require authentication
- drafts and generated shopping results are always user-scoped
- `/api/v1/me` is the authenticated profile boundary
- `/api/v1/auth/*` provides register, login, Google login, refresh, and logout

## Current Web Surfaces

The current web app is intentionally split into separate surfaces:

- `/` is the planning home
- `/recipes` is the recipe browsing/library surface
- `/shopping` is the saved shopping-cart library surface
- recipe detail lives in an overlay on top of `/recipes`
- the cart builder lives in a large overlay and can be entered from home or from recipe detail
- draft detail and cart detail stay in overlays so the user can work without losing workspace context
- shopping-cart detail now also opens as a large overlay from cart detail, so the retail output stays in the same workspace flow
- the shopping-cart overlay can now edit the same persisted resource by replacing matched products, adding manual items, and deleting lines
- the shopping-cart overlay can now also adjust `selected_quantity` per line with subtotal recalculation
- the planning composer can now adjust quantity per selected recipe, so the same dish can be planned multiple times

This keeps recipe exploration from competing with planning state on the same page.

Strategic note:

- these surfaces are useful for exercising the backend and validating flows
- they should not receive heavy visual redesign work in this codebase unless a bug blocks validation
- a future production frontend can be rebuilt once the backend contracts are stable

Current interaction model:

- `Browse recipes` leads to `/recipes`
- `Add to cart` from recipe detail opens the cart builder preloaded with that recipe
- `Save draft` exists as a secondary persistence action inside the builder
- `Generate cart` is the primary planning action
- draft/cart detail overlays can reopen the same builder in edit mode
- draft/cart detail overlays can delete the current resource
- cart detail can now call `POST /api/v1/carts/:cartId/shopping-carts` and open the returned `ShoppingCart` immediately in an overlay
- shopping-cart detail can now search retailer products and persist manual edits through `PATCH /api/v1/shopping-carts/:id`
- if the chosen retailer is Kroger and no shopping location is set, shopping-cart generation now fails explicitly instead of silently returning an empty cart

Current transitional auth setup:

- JWT access tokens are the primary authenticated path
- refresh tokens are persisted and rotated
- `User` is the ownership root
- `AuthIdentity` stores provider-linked identities
- `RefreshToken` stores hashed refresh tokens

## Live API Shape

The internal API now lives under `/api/v1`.

Implemented route families:

- `/api/v1/recipes`
- `/api/v1/recipe-forks`
- `/api/v1/cart-drafts`
- `/api/v1/carts`
- `/api/v1/shopping-carts`
- `/api/v1/retailers`

Implemented mapping:

- `POST /api/v1/recipe-forks` replaces the older save-style command route
- `POST /api/v1/carts` creates the meal-plan snapshot
- `POST /api/v1/carts/:cartId/shopping-carts` derives a purchase basket from a cart
- Instacart shopping-cart generation can persist an `external_url` for a hosted Instacart shopping-list handoff
- `GET /api/v1/retailers/capabilities` reports which retailer paths currently support product search, location lookup, cart handoff, native checkout, and demo priority

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

Persisted but secondary planning state:

- `CartDraft`

Primary planning state in the current UX:

- `Cart`

Derived but persisted shopping state:

- resolved dishes
- aggregated ingredient overviews
- matched cart items
- estimated subtotal

Derived at cart-read time:

- aggregated ingredient overview for `Cart`

Ephemeral state:

- request-scoped actor context
- request-scoped request id
- intermediate matching candidates during computation

Not implemented yet:

- recipe variants
- raw LLM outputs
- async matching jobs
- richer store-resolution UX and persisted saved-store management for Kroger
- meal-idea recipe generation
- external recipe import from URL, text, screenshot, menu, or creator content
- pre-cart ingredient review/removal
- full pantry quantity deduction
- computer-vision inventory capture
- structured AI recipe generation and editing
- contextual cooking assistant runtime
- nutrition provider integration
- cart export or Share-A-Cart-style transfer flow
- pantry/inventory awareness beyond manual cart edits

Not first-class in UI yet:

- shopping-cart history and repeat-shopping revisit flows
- recovery or history after delete

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
- OpenAI integration

Implemented but still hardening:

- real external retailer integration through Kroger
- external cart handoff through Instacart
- provider-side throttling, token deduping, and location/query caching to reduce burst traffic

Planned external tool posture:

- evaluate open-source MCPs for retailer, nutrition, recipe generation, pantry, and cart-export workflows
- wrap any adopted MCP behind internal provider interfaces
- keep the core app usable if an MCP is unavailable or replaced

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
- `/me/preferences` now also stores a neutral `shopping_location` block, including optional `kroger_location_id` for future store reuse
- `/me/onboarding/complete` is implemented
- the web app now uses bearer-token auth for its dashboard flow
- the temporary `x-user-id` fallback has now been removed from normal backend flows and Swagger guidance
- the web app now exposes an authenticated `/account` surface for profile and preference management

### 2. Hybrid Tags And Controlled Cuisine

Purpose:

- support shared taxonomy plus private user organization

Status:

- explicit `Tag` and `RecipeTag` persistence is implemented
- `/api/v1/tags` is implemented
- dietary badge treatment should reuse curated system tags rather than introducing dedicated booleans per recipe
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
- onboarding and account/preferences both expose manual shopping-location capture using the same preference surface

### 3. Real Retailer Providers

Purpose:

- replace mock matching behind the `ShoppingCart` boundary without redesigning cart resources

Status:

- the resource boundary is already in place
- the provider boundary is now implemented
- the mock provider remains the default fallback
- Kroger is now the first live provider path
- Walmart remains prepared behind the same boundary for later enablement
- Kroger currently depends on manual shopping location and benefits from cached `locationId` reuse to avoid repeated `/locations` calls

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

### 5. Agentic Cooking Layer

Purpose:

- add AI-assisted generation, editing, and real-time cooking guidance on top of the stable recipe/cart/shopping model

Planned responsibilities:

- generate structured recipes from preferences
- import/fork recipes from external content
- edit existing recipes under constraints
- use nutrition tools for calories/macros when available
- guide a user through a recipe with awareness of preferences, current recipe, current step, and selected shopping products
- suggest substitutions, timing changes, or troubleshooting steps

Status:

- product direction is approved
- runtime implementation has not started
- AI must produce or consume structured domain data rather than replacing deterministic aggregation, pricing, or matching

## Design Rules

- deterministic logic for aggregation, matching, and pricing
- AI only for constrained transformations
- explicit module boundaries
- structured data over free text
- shared contracts across apps
- system recipes remain immutable
- user-owned data is isolated by default
- retailer matching and purchasable-product resolution belong to `ShoppingCart`, even though `Cart` now keeps retailer context
- current frontend is a prototype surface; backend/API/tool contracts are the product foundation
- MCPs and external tools are adapters, not the source of domain truth

## Practical Reading Guide

If you want the current truth of the system:

1. read [docs/business.md](/C:/Users/akuma/repos/cart-generator/docs/business.md) for the startup thesis, target, and go-to-market
2. read [docs/goals.md](/C:/Users/akuma/repos/cart-generator/docs/goals.md) for the product and engineering direction
3. read this file for implemented architecture and transitional boundaries
4. read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for policy and API-shape decisions
5. read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual vocabulary
6. read Swagger at `/docs` for the live implemented `/api/v1` contract
