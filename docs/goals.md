# Goals - Cussien

This document describes the product and engineering direction for Cussien after the first working recipe-to-cart vertical slice.

## Product Vision

Cussien should become an agentic cooking and grocery workspace.

The product should help a user move through the full loop:

```text
preferences -> recipes -> meal plan -> grocery cart -> cooking guidance -> iteration
```

The long-term product is not only a recipe app and not only a shopping-list app. It should become a personal cooking system that understands:

- what the user likes
- what the user cannot or does not want to eat
- what recipes they own or are exploring
- what they are planning to cook
- what ingredients and products are available near them
- what they are actively cooking right now

## Current Strategic Decision

The current frontend should be treated as a functional prototype and testing harness.

It is useful for validating:

- auth
- onboarding
- recipe browsing
- cart generation
- Kroger product matching
- shopping-cart editing
- future AI and provider endpoints

It should not receive heavy visual investment from here.

Only fix frontend issues when they block product validation or core flows. A future frontend rebuild can happen with a dedicated design/code-generation tool such as Lovable, Stitch, v0, or a hand-built production interface once the backend and product contracts are stronger.

## Engineering Priorities

### 1. Stabilize The Backend Product Core

The backend should remain the source of truth for domain behavior.

High-priority work:

- make the `/api/v1` resource model stable
- keep `Recipe`, `CartDraft`, `Cart`, and `ShoppingCart` distinct
- keep retailer matching behind provider boundaries
- improve shopping-location and store-resolution behavior
- preserve deterministic aggregation and pricing logic
- make errors clear and recoverable

### 2. Strengthen Retail Provider Architecture

Retailer integrations should sit behind a stable internal provider contract.

Current providers:

- mock provider for local/dev fallback
- Kroger provider for live product search and pricing
- Walmart provider boundary for later activation

Future candidates:

- Walmart
- Target
- Instacart or cart-export integrations
- Amazon Fresh or Whole Foods if access is practical
- Share-A-Cart-style export or browser-extension assisted cart loading

Important rule:

- provider integrations should be adapters
- they should not shape the core domain model directly

### 3. Evaluate MCPs As Adapters, Not As Core

Open-source MCP servers may help accelerate integrations.

Potential MCP/tool categories:

- retailer product search
- cart export
- nutrition and calorie lookup
- pantry/inventory
- recipe generation
- web/browser automation for cart transfer

The core app should not depend directly on a specific MCP implementation. Instead, MCPs should be evaluated and wrapped behind internal interfaces such as:

- `RetailerProductProvider`
- `NutritionProvider`
- `RecipeGenerationProvider`
- `RecipeEditingProvider`
- `CartExportProvider`
- `CookingAssistantToolProvider`

This keeps the product resilient if an MCP is abandoned, has a weak license, returns inconsistent data, or cannot run in production.

### 4. Build Nutrition As A Tool Layer

Nutrition should become a first-class capability, but not through guesswork.

Preferred path:

- structured ingredients remain the source of truth
- deterministic nutrition databases should be preferred when available
- AI may help normalize ambiguous ingredients or serving descriptions
- `nutrition_data` remains a derived recipe snapshot, not the primary recipe model

Product use cases:

- calories/macros per recipe
- calories/macros per serving
- compare recipe variants
- generate higher-protein, lower-carb, lower-calorie, or budget-adjusted versions

### 5. Add AI Recipe Generation And Editing

AI should generate and edit structured recipes, not free-text blobs.

Important use cases:

- generate recipes from preferences
- adapt recipes to dietary badges
- adapt recipes to budget or available stores
- scale recipes
- replace unavailable ingredients
- create weekly meal plans
- explain cooking techniques

Output should map into existing domain structures:

- `BaseRecipe`
- `DishIngredient`
- `RecipeStep`
- `Tag`
- `Cuisine`
- `nutrition_data`

### 6. Build A Contextual Cooking Assistant

The cooking assistant should eventually understand:

- the user profile
- preferences and dietary badges
- the current recipe
- the current cart or meal plan
- the current cooking step
- available substitutions
- products already chosen in the shopping cart

Example jobs:

- guide the user through a recipe in real time
- answer "what can I use instead?"
- adjust if a step goes wrong
- explain why a technique matters
- help cook multiple dishes in parallel
- adapt timing based on user constraints

This should be implemented after the recipe/cart/shopping contracts are stable enough to provide reliable context.

### 7. Explore Cart Export And Transfer

Share-A-Cart proves there is demand for loading or sharing carts across retailers with less friction.

Cussien should explore similar output paths:

- shareable shopping-cart links
- browser-extension assisted cart loading
- retailer-native cart APIs where available
- export formats for manual checkout
- collaborative shopping carts later

The first goal is not necessarily checkout automation. The first goal is making the generated retailer basket easy to act on.

## Product Priorities

### Near Term

1. Keep refining Kroger matching quality.
2. Improve shopping-location and store reuse.
3. Add GPS-assisted location capture.
4. Evaluate open-source MCPs/tools for nutrition, retailers, and cart export.
5. Design backend contracts for AI recipe generation/editing.

### Medium Term

1. Implement recipe generation/editing with structured AI output.
2. Add nutrition calculation and nutrition-aware recipe variants.
3. Add saved provider/store management.
4. Add cart export/share flows.
5. Prepare a frontend rebuild around the stabilized backend contracts.

### Later

1. Build the contextual cooking assistant.
2. Add pantry/inventory awareness.
3. Add collaborative planning and shared carts.
4. Add more retailers/providers.
5. Consider MCP-based external tool hosting once the internal provider interfaces are stable.

## Non-Goals For Now

- do not deeply polish the current frontend
- do not let AI decide pricing or final shopping quantities
- do not couple the domain model to one retailer
- do not make MCPs the core app architecture before validating them
- do not chase direct checkout until provider access and UX are clearer

## Success Criteria

Cussien is moving in the right direction if:

- a user can build a meal plan from recipes quickly
- the app generates a real, editable shopping cart
- provider failures are understandable and recoverable
- AI output lands as structured domain data
- the backend is strong enough for a future frontend rebuild
- adding another retailer or nutrition source does not require rewriting the core product
