# Ingredient Canonicalization Layer

Date: 2026-05-08
Owner: papostigo
Branch: `piero/postgres-audit`
Status: Phase 1 implemented in `piero/postgres-audit`

## Decision

Chef should treat ingredients as a canonical domain model, not only as display strings.

This should be implemented as a staged backend/database refactor. Do not redesign carts, shopping-cart snapshots, or the vision training pipeline in the first pass.

## Why This Matters

Ingredients connect most of the product:

- generated recipes
- imported recipes
- recipe browsing and search
- grocery cart generation
- product matching
- kitchen inventory
- pantry staples
- profile memory and food rules
- vision scan results
- future nutrition/macros/allergy logic

The app already has an `Ingredient` table, but it is not yet used consistently across all ingredient-bearing records.

## Current State

Strong relational areas:

- `Ingredient` exists with `canonicalName`, `slug`, `aliases`, `category`, `defaultUnit`, and `visionLabels`.
- `KitchenInventoryItem` references `ingredientId`.
- `UserFoodRule` can reference `ingredientId`.
- `UserPantryStaple` references `ingredientId`.
- `AggregatedIngredient` in `packages/shared/src/aggregation.ts` already supports optional `ingredient_id`.

String/snapshot areas:

- `DishIngredient` stores `canonicalIngredient` as a string and has no `ingredientId`.
- AI recipe generation emits `canonical_ingredient` strings.
- recipe create/update DTOs accept `canonical_ingredient` strings.
- recipe API responses expose `canonical_ingredient` strings.
- cart, ingredient-review, shopping-cart, and matched-item records are JSON snapshots.
- retailer matching currently queries by ingredient string.

This is not all bad. Some surfaces should remain snapshots. The issue is that recipe ingredients have no stable bridge to the canonical `Ingredient` table.

## Goals

- Add canonical ingredient identity to recipe ingredients without breaking existing API contracts.
- Preserve `canonical_ingredient` strings as display/search/snapshot fallback.
- Let recipe generation, recipe import, inventory, profile memory, and cart aggregation converge on the same ingredient identity over time.
- Make ingredient matching safer by allowing ID-based joins where available.
- Prepare a clean bridge for vision labels and detector output without touching Gallo's training code.
- Keep the launch/demo path stable.

## Non-Goals

- Do not remove `canonical_ingredient` from shared/API contracts.
- Do not normalize cart or shopping-cart JSON snapshots in this pass.
- Do not change YOLO model classes, checkpoints, training scripts, or detector pipeline behavior.
- Do not auto-train vision models from production user data.
- Do not make a large ingredient ontology redesign before the basic resolver is proven.
- Do not require frontend changes for Phase 1.

## Proposed Data Model Changes

### Phase 1: Link Recipe Ingredients

Add nullable ingredient identity to `DishIngredient`:

```prisma
model DishIngredient {
  id                  String     @id @default(cuid())
  baseRecipeId        String
  ingredientId        String?
  canonicalIngredient String
  amount              Float
  unit                String
  displayIngredient   String?
  preparation         String?
  optional            Boolean    @default(false)
  ingredientGroup     String?
  sortOrder           Int
  baseRecipe          BaseRecipe @relation(fields: [baseRecipeId], references: [id], onDelete: Cascade)
  ingredient          Ingredient? @relation(fields: [ingredientId], references: [id], onDelete: SetNull)

  @@index([baseRecipeId, sortOrder])
  @@index([ingredientId])
  @@index([baseRecipeId, ingredientId])
}
```

Keep `canonicalIngredient` required. It is still the recipe-line snapshot and the safe fallback if the canonical ingredient row is deleted or unresolved.

### Phase 2: Consider Ingredient Aliases

The current `Ingredient.aliases Json?` is acceptable for seed/demo data, but it will become awkward once aliases are user-corrected, source-specific, or queryable.

If alias quality becomes product-critical, introduce:

```prisma
model IngredientAlias {
  id              String     @id @default(cuid())
  ingredientId    String
  alias           String
  normalizedAlias String
  source          String
  confidence      String
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([normalizedAlias])
  @@index([ingredientId])
}
```

Do not add this table in Phase 1 unless JSON aliases already block implementation.

## Resolver Design

Create a backend resolver responsible for ingredient identity:

`IngredientResolverService`

Responsibilities:

- normalize display strings into comparable labels and slugs
- resolve by exact `Ingredient.slug`
- resolve by normalized `Ingredient.canonicalName`
- optionally resolve by aliases
- return both `ingredientId` and canonical display data when matched
- avoid polluting the ingredient catalog with low-quality AI/import strings

Recommended initial behavior:

- Resolve known ingredients when possible.
- Leave `ingredientId` null when confidence is low.
- Preserve the original `canonical_ingredient` string either way.
- Only create new `Ingredient` rows through explicit user/admin/seed flows, or a clearly named trusted path such as `ensureIngredient`.

Reason: LLM/imported recipe text can create junk ingredients if blindly upserted.

## Recipe Flow

Recipe create/update should continue accepting:

```ts
{
  canonical_ingredient: string;
  amount: number;
  unit: string;
}
```

During persistence:

1. Normalize `canonical_ingredient`.
2. Try to resolve it to `Ingredient`.
3. Store `DishIngredient.ingredientId` if found.
4. Always store `DishIngredient.canonicalIngredient`.

Recipe responses should remain backwards-compatible:

```ts
{
  canonical_ingredient: string;
  ingredient_id?: string;
}
```

`ingredient_id` can be added as optional. Existing frontend code does not need to consume it immediately.

## Cart And Shopping Cart Flow

Cart and shopping-cart records should remain snapshots for now.

However, aggregation can carry `ingredient_id` when source dish ingredients have it:

- group by `ingredient_id + unit` when all relevant rows have IDs
- fallback to `canonical_ingredient + unit`
- preserve `canonical_ingredient` in outputs
- keep product matching string-based until provider logic is explicitly upgraded

This keeps the current checkout/cart behavior stable while preparing better matching.

## Inventory/Profile Memory Flow

Inventory, pantry staples, and profile memory already use `ingredientId` where it matters.

Once recipe ingredients can also reference `ingredientId`, Chef can safely answer:

- "do I already have this ingredient?"
- "does this recipe violate a food rule?"
- "which recipes use this ingredient?"
- "which generated/imported recipes match my pantry?"

without relying only on fragile string equality.

## Vision Boundary

Vision is owned by Gallo. This spec should not directly modify YOLO training, checkpoints, datasets, or detector code.

Allowed backend-facing integration:

- keep `packages/shared/vision-label-mappings.json` as a shared mapping artifact
- allow `Ingredient.visionLabels` to store labels that map detector outputs to canonical ingredients
- expose or document a stable mapping from vision label -> ingredient slug/id
- let Gallo choose when and how the vision pipeline consumes this mapping

Not allowed in this branch:

- changing detector classes
- retraining YOLO
- editing checkpoint selection
- changing vision pipeline runtime behavior
- automatically using user scan corrections as training data without a review process

## Backfill Strategy

Phase 1 migration should be safe:

- add nullable `DishIngredient.ingredientId`
- add indexes
- no destructive changes
- no required backfill at migration time

Then add an idempotent script or seed step:

1. Read existing `DishIngredient.canonicalIngredient`.
2. Resolve against `Ingredient.slug`, `canonicalName`, and aliases.
3. Update `ingredientId` only for confident matches.
4. Report unresolved ingredients.

Do not fail deploy because some old ingredients are unresolved.

## API And Shared Contract Changes

If Phase 1 adds `ingredient_id` to recipe ingredient responses, update:

- `packages/shared/src/recipe.ts`
- API DTOs
- Swagger DTOs/examples
- recipe mapper tests
- recipe create/update e2e tests if affected

Do not make `ingredient_id` required in request payloads.

## Testing Plan

Minimum tests for Phase 1:

- resolver resolves exact slug matches
- resolver resolves normalized canonical names
- resolver leaves unknown ingredients unresolved
- recipe create persists `ingredientId` for known ingredient
- recipe create still works for unknown ingredient with null `ingredientId`
- recipe response includes `canonical_ingredient` exactly as before
- cart generation behavior remains backwards-compatible

Useful follow-up tests:

- aggregation carries `ingredient_id` when source recipe ingredients have it
- inventory deduction prefers `ingredient_id` when available
- food-rule matching can use `ingredient_id` when available

## Risks

- Catalog pollution from blindly creating ingredients out of AI/import strings.
- Frontend breakage if `canonical_ingredient` is removed or renamed.
- Cart behavior drift if snapshots are normalized too early.
- Vision ownership conflict if backend changes training/runtime behavior without Gallo.
- False confidence if string aliases are treated as perfect identity.

## Recommended PR Order

1. Spec only. Done.
2. Nullable `DishIngredient.ingredientId` migration, Prisma client, mapper/shared optional field, and mapper tests. Done.
3. Recipe create/update resolver wiring and backcompat tests. Done.
4. Idempotent backfill/report script. Partially done through migration backfill and seed linking; unresolved reporting remains.
5. Cart aggregation improvements using `ingredient_id` when available. Not done.
6. Vision mapping handoff, coordinated with Gallo. Not done.

## Notion Task Suggestion

Task name:

`Ingredient canonicalization layer`

Layer:

`Core`

Type:

`Coding`

Notes:

- Link recipe ingredients to canonical `Ingredient` rows with nullable `DishIngredient.ingredientId`.
- Preserve existing `canonical_ingredient` string contracts.
- Add resolver service and tests.
- Backfill known recipe ingredients safely.
- Keep cart/shopping-cart JSON as snapshots for now.
- Do not touch YOLO training/checkpoints; provide a stable mapping for Gallo to consume later.
