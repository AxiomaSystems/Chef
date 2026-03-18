# Architecture - Cart Generator

## Overview

Cart Generator is intended to be a layered decision system that transforms:

```text
user-selected recipes + constraints -> structured grocery cart
```

The core design goal is to keep the system stateful and deterministic at its center, with AI used only for controlled transformations.

## End-to-End Pipeline

```text
Base recipes
  -> Recipe selection
  -> Optional adaptation
  -> Dish normalization
  -> Ingredient aggregation
  -> Product matching
  -> Cost estimation
  -> Generated cart
```

## System Layers

### 1. Recipe Layer

Purpose:
- store stable, reusable recipes
- represent what a user actually cooks

Core entities:
- `BaseRecipe`
- `DishIngredient`
- `RecipeStep`

### 2. Selection Layer

Purpose:
- capture user intent for a specific cooking session or weekly plan

Core entities:
- `CartDraft`
- `SelectedRecipe`

### 3. Adaptation Layer

Purpose:
- transform a base recipe under explicit constraints without replacing the original

Examples:
- cheaper
- halal
- vegan
- calorie-adjusted

Core entities:
- `RecipeVariant`
- `RecipeAdaptationRequest`

### 4. Normalization Layer

Purpose:
- convert recipes into consistent computation-ready dishes

Responsibilities:
- canonical ingredient naming
- unit normalization
- quantity normalization

### 5. Aggregation Layer

Purpose:
- merge multiple dishes into one consolidated ingredient overview

Rules:
- deterministic only
- no AI involvement

Core entity:
- `AggregatedIngredient`

### 6. Product Matching Layer

Purpose:
- map normalized ingredient needs to purchasable products

Typical flow:
1. generate a search query
2. retrieve candidates from a mock or real catalog
3. score candidates
4. select the best fit

Core entities:
- `ProductCandidate`
- `MatchedIngredientProduct`

### 7. Cart Layer

Purpose:
- produce the final structured cart returned to the client

Core entity:
- `GeneratedCart`

## Planned Backend Modules

```text
apps/api/src/
|-- recipe/
|-- variant/
|-- cart/
|-- aggregation/
|-- matching/
`-- llm/
```

Current implementation note:
- these modules do not exist yet
- the current API is still the default Nest starter

## API Direction

Planned main endpoint:

```http
POST /cart/generate
```

Planned service flow:

```text
request
  -> CartService
  -> RecipeService
  -> optional LLMService
  -> AggregationService
  -> MatchingService
  -> response
```

## State Boundaries

Persistent state:
- base recipes
- recipe variants
- cart drafts

Derived state:
- aggregated ingredients
- generated carts

Ephemeral state:
- raw LLM output
- temporary product candidates

## Infrastructure Direction

Planned local services:
- PostgreSQL for persistence
- Redis for cache and async jobs
- OpenAI for recipe adaptation

Planned local orchestration:
- Docker

## Design Rules

- deterministic logic for aggregation, matching, and pricing
- AI only for constrained transformations
- explicit module boundaries
- structured data over free text
- shared contracts across apps
