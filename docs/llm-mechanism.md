# LLM Mechanism - Chef

## Provider Recommendation

The first real provider should be OpenAI through the Responses API, with `gpt-5.4-mini` as the default development model and `gpt-5.5` available for higher-quality planning/evaluation runs.

Reasoning:

- Chef needs schema-shaped recipe data more than free-form prose.
- OpenAI documents `gpt-5.5` as the default starting point for complex reasoning, while recommending smaller variants such as `gpt-5.4-mini` when optimizing latency and cost.
- OpenAI Structured Outputs supports JSON Schema formatting with strict schema adherence in the Responses API.
- Anthropic is still a strong secondary provider. Claude now supports structured JSON outputs and strict tool use, so the implementation should keep the provider boundary swappable.

Sources:

- OpenAI models: https://developers.openai.com/api/docs/models
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Anthropic structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic tool use: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works

## Current Repo Flow

The implemented product flow is:

```text
Recipe -> CartDraft -> Cart -> ShoppingCart
```

Current user flow:

1. Home/dashboard loads authenticated user, recipes, carts, and shopping carts.
2. User chooses recipes from dashboard or recipe library.
3. `submitDraftFlowAction` saves a `CartDraft` or generates a `Cart`.
4. A `Cart` contains selected recipes, retailer context, expanded dishes, and deterministic ingredient overview.
5. `createShoppingCartAction` calls `POST /api/v1/carts/:cartId/shopping-carts`.
6. The API aggregates missing ingredients, skips kitchen inventory items, runs retailer matching/export, and persists a `ShoppingCart`.
7. Shopping-cart detail lets the user replace matched products, add manual lines, delete lines, and save corrections.

Important boundary:

- LLMs should generate or edit structured recipe data.
- Deterministic services should keep owning aggregation, inventory filtering, product matching, quantities, and subtotal math.

## What Was Added In The Streamlit Lab

Initial Streamlit lab:

```text
apps/llm-testing/
|-- app.py
|-- requirements.txt
|-- README.md
`-- chef_llm/
    |-- contracts.py
    |-- engine.py
    `-- providers.py
```

Capabilities:

- generate structured recipe previews from a meal prompt
- include dietary preferences, allergies, disliked ingredients, inventory, budget mode, meal style, time, cost, and quality goals
- request multiple meals for weekly or meal-prep planning
- propose ingredient swaps with downsides and benefits
- require explicit confirmation before applying a swap in the Streamlit session
- regenerate a deterministic cart preview from current recipe ingredients
- run in `mock`, `openai`, or `anthropic` provider mode

The mock provider is intentionally included so UI and schema work can continue without API keys or token spend.

## What Is Integrated In The Main App

The real application now has a first backend AI module:

```text
apps/api/src/ai/
|-- ai.controller.ts
|-- ai.module.ts
|-- ai.provider.ts
|-- ai.schemas.ts
|-- ai.service.ts
|-- ai.types.ts
|-- dto/
|   |-- chat.dto.ts
|   |-- generate-meals.dto.ts
|   |-- recipe-preview.dto.ts
|   `-- swap-ingredient.dto.ts
`-- providers/
    |-- mock-ai.provider.ts
    `-- openai-ai.provider.ts
```

Implemented endpoints:

- `GET /api/v1/ai/status`
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/meals/generate`
- `POST /api/v1/ai/recipes/swap-ingredient`

All current AI endpoints require the normal bearer-token auth path.

Provider behavior:

- `CHEF_LLM_PROVIDER=mock` uses deterministic local responses.
- `CHEF_LLM_PROVIDER=openai` calls the OpenAI Responses API with strict JSON Schema for structured outputs.
- `OPENAI_MODEL` controls the active OpenAI model.

The frontend now has a global Chef chat widget:

```text
apps/web/src/components/ai/chef-chat-widget.tsx
apps/web/src/app/ai-actions.ts
```

The widget is mounted in `AppShell`, so it appears across the authenticated workspace pages. It can answer cooking, meal prep, ingredients, substitutions, recipe, and Chef workflow questions. It sends the current page path as lightweight context and keeps short local conversation history.

## Current Agentic Features

Current working capabilities:

1. Contextual food chat on authenticated app pages.
2. Structured meal/recipe preview generation through the backend API.
3. Structured ingredient swap proposals with downsides, benefits, and updated recipe output.
4. Mock provider fallback for development without token spend.
5. OpenAI provider path for real model calls.
6. Strict JSON schemas for outputs that need to become product data.

Current limits:

- generated recipe previews are not yet saved into `BaseRecipe`
- generated meal plans do not yet create `Cart` records automatically
- ingredient swaps are not yet wired into the existing recipe edit modal
- chat can answer with page context, but it cannot yet call tools to fetch the user's current recipes, carts, shopping carts, or inventory
- AI does not yet run retailer matching, pricing, or deterministic aggregation, by design

## Future Backend Shape

The first backend module is now in place. Recommended next implementation shape:

```text
apps/api/src/ai/
|-- ai.module.ts
|-- ai.service.ts
|-- providers/
|   |-- recipe-generation.provider.ts
|   |-- recipe-editing.provider.ts
|   |-- openai-recipe.provider.ts
|   `-- anthropic-recipe.provider.ts
|-- dto/
|   |-- generate-recipe.dto.ts
|   `-- adapt-recipe.dto.ts
`-- schemas/
    `-- structured-recipe.schema.ts
```

Recommended API additions after the first integration:

- `POST /api/v1/ai/meal-plans/generate`
- `POST /api/v1/ai/recipes/save-preview`
- later: `POST /api/v1/ai/recipe-imports/structure`
- later: `POST /api/v1/ai/chat/tool-call`

Generated recipes should land as structured previews first. Persist them through the existing recipe create/fork flow only after user confirmation.

## Future Agentic Goals

Near-term:

1. Let generated recipe previews create user-owned recipes after confirmation.
2. Add a recipe-generation UI surface in the app, likely from dashboard and recipe library.
3. Wire ingredient swap proposals into recipe detail/edit flows.
4. Add ingredient-review overrides before shopping-cart generation.
5. Let generated meal plans create `Cart` records with recipe quantities.
6. Give chat read-only tools for current user preferences, inventory, recipes, carts, and shopping carts.
7. Add model eval fixtures for dietary compliance, allergy avoidance, cost awareness, ingredient structure, and swap quality.

Later:

1. Add recipe import from URL, pasted text, screenshots, menus, and creator posts.
2. Add nutrition provider integration before treating nutrition estimates as reliable.
3. Add a cooking assistant context that knows recipe step, selected products, substitutions, and user preferences.
4. Add agentic tool calling for "create recipe", "create cart", "generate shopping cart", and "replace shopping-cart item" with explicit user confirmation.
5. Add memory/history policies for prior meals, liked substitutions, budget patterns, and preferred retailers.
6. Add voice or live cooking mode only after recipe/cart context is strong.

## Run The Integrated Project

From the repo root:

```bash
pnpm install
pnpm api:setup
pnpm dev
```

Or run each side separately:

```bash
pnpm api:up
pnpm dev:web
```

Required `.env` values for real OpenAI calls:

```env
CHEF_LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
```

Use mock mode when you want the app to run without model calls:

```env
CHEF_LLM_PROVIDER=mock
```

Main URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`
- Streamlit lab: `http://localhost:8501` when started separately

## Open Questions

- Which real API key should be used first: OpenAI, Anthropic, or both?
- Should generated recipes be saved automatically, or always require user confirmation?
- Should the first backend endpoint return one recipe preview or a full weekly meal-plan object?
- How aggressive should cost minimization be when it conflicts with quality, cultural accuracy, or macros?
