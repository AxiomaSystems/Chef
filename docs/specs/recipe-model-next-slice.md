# Recipe Model Next Slice

Date: 2026-06-27
Owner: papostigo
Status: Proposed

## Decision

Recipe model changes should ship as a focused contract slice, not as isolated
Prisma columns.

The app is already wired through Nest, Prisma, shared package types, Swagger,
Next server actions, recipe forms, capture/import drafts, AI previews, seed
data, carts, meal plans, and preparation views. Any new recipe field that is
user-facing should be added through that full path.

## Current State

`BaseRecipe` owns the recipe-level fields:

- ownership and fork state
- cuisine relation
- name, description, cover image
- optional `nutritionData` JSON
- servings
- timestamps

Related tables own structured children:

- `DishIngredient` for ordered ingredients and optional canonical
  `Ingredient` identity.
- `RecipeStep` for ordered preparation steps.
- `RecipeTag` for dietary/category tags.

The current public API response type is `BaseRecipe` in
`packages/shared/src/recipe.ts`, mapped by `recipe.mapper.ts`. Create/update
payloads flow through DTO validation, `recipe.persistence.mapper.ts`, frontend
server actions, and `RecipeCreateModal`.

## Recommended First Field Slice

The safest next recipe-model slice is recipe metadata that improves browsing,
planning, and preparation without changing ingredient/cart semantics:

- `prepTimeMinutes Int?`
- `cookTimeMinutes Int?`
- `totalTimeMinutes Int?`
- `difficulty RecipeDifficulty?`
- `sourceName String?`
- `sourceUrl String?`

Rationale:

- Times and difficulty are visible on recipe cards/details/preparation but do
  not affect grocery aggregation.
- Source metadata aligns with Capture/import attribution without forcing raw
  source content into `BaseRecipe`.
- Nullable columns are production-safe and can be backfilled gradually.

Avoid adding these as JSON unless the shape is deliberately variable. They are
small, queryable, user-facing fields with clear validation rules.

## Data Model Shape

Prefer scalar columns for queryable metadata:

```prisma
enum RecipeDifficulty {
  easy
  medium
  hard
}

model BaseRecipe {
  prepTimeMinutes  Int?
  cookTimeMinutes  Int?
  totalTimeMinutes Int?
  difficulty       RecipeDifficulty?
  sourceName       String?
  sourceUrl        String?
}
```

Recommended constraints:

- each time field is `NULL OR BETWEEN 0 AND 1440`
- `totalTimeMinutes IS NULL OR totalTimeMinutes >= COALESCE(prepTimeMinutes, 0)`
- `sourceName IS NULL OR length(sourceName) <= 180`
- `sourceUrl IS NULL OR length(sourceUrl) <= 2048`

If `totalTimeMinutes` is always derivable from prep + cook, do not store it.
Store it only if product wants an explicit user/provider override.

## Required Wiring

Backend:

- `apps/api/prisma/schema.prisma`
- Prisma migration with safe nullable columns and checks
- `CreateRecipeDto` and `UpdateRecipeDto`
- `recipe.persistence.mapper.ts`
- `recipe.mapper.ts`
- `recipe.swagger.ts` examples/response DTOs
- recipe repository mapper tests
- capture save-as-recipe mapping if source fields come from Capture
- AI recipe preview DTO/schema/provider mapping if AI can emit these fields
- seed data helpers if system recipes should show these fields

Shared contracts:

- `packages/shared/src/recipe.ts`
- `packages/shared/src/capture.ts` if imported previews carry source/time data

Frontend:

- `CreateRecipePayload` in `apps/web/src/app/home-actions.ts`
- `RecipeCreateModal` create/edit fields
- recipe cards, detail, and preparation page display
- imported draft prefill from Capture/session storage
- any AI autofill preview mapping

Docs:

- `docs/models.md`
- this spec, once implemented, should move to `Status: Implemented`.

## Compatibility Rules

- New persisted fields should start nullable.
- API responses may expose optional fields immediately.
- Frontend should treat missing values as absent, not zero.
- Do not make Capture/import/AI output required in the same migration.
- Do not change existing ingredient or step contracts in this slice.
- Do not store raw imported recipe text in `BaseRecipe`.

## Suggested Implementation Plan

1. Add nullable Prisma fields and constraints.
2. Generate Prisma client.
3. Add shared optional fields.
4. Wire DTO validation and persistence/response mappers.
5. Add frontend form fields and display surfaces.
6. Wire Capture/AI/seed only for fields that already exist in those sources.
7. Validate with Prisma migrate from zero, API tests/build, shared build, and
   web build.

## Open Product Questions

- Should `totalTimeMinutes` be stored or derived?
- Should difficulty be user-editable, AI-estimated, or both?
- Which source attribution should be visible to users after Capture saves a
  recipe?
- Are these fields enough for the next recipe browsing/planning UX, or should
  `equipment`, `estimatedCost`, or `skillTags` be prioritized instead?
