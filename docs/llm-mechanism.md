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

## What Was Added

New Streamlit lab:

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

## Future Backend Shape

Recommended NestJS modules later:

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

Recommended API additions:

- `POST /api/v1/ai/recipes/generate`
- `POST /api/v1/ai/recipes/adapt`
- `POST /api/v1/ai/meal-plans/generate`
- later: `POST /api/v1/ai/recipe-imports/structure`

Generated recipes should land as structured previews first. Persist them through the existing recipe create/fork flow only after user confirmation.

## Future Product Steps

1. Convert the Python schemas into shared TypeScript/Zod schemas or generate JSON Schema from shared contracts.
2. Add backend provider interfaces matching `RecipeGenerationProvider` and `RecipeEditingProvider`.
3. Persist AI preview/audit data only after deciding retention policy.
4. Add ingredient-review overrides before shopping-cart generation.
5. Let generated recipe previews create user-owned recipes.
6. Let generated meal plans create carts with quantities.
7. Add model eval fixtures for dietary compliance, cost awareness, ingredient structure, and swap quality.
8. Add nutrition provider integration before treating nutrition estimates as reliable.

## Open Questions

- Which real API key should be used first: OpenAI, Anthropic, or both?
- Should generated recipes be saved automatically, or always require user confirmation?
- Should the first backend endpoint return one recipe preview or a full weekly meal-plan object?
- How aggressive should cost minimization be when it conflicts with quality, cultural accuracy, or macros?
