# Vision / Ingredient Canonicalization Handoff

Date: 2026-05-08
Audience: Gallo / vision owner
Owner: papostigo

## Context

Backend now has a safer canonical ingredient bridge.

`Ingredient` already existed and was used by:

- kitchen inventory
- pantry staples
- profile memory food rules

The new change links recipe ingredient rows to canonical ingredients too.

## What Changed

`DishIngredient` now has:

- `ingredientId?: string`
- relation to `Ingredient`
- existing `canonicalIngredient` string still required

Migration:

- `apps/api/prisma/migrations/20260508090000_link_dish_ingredients_to_ingredients/migration.sql`

Important behavior:

- recipe create/update still accepts `canonical_ingredient` strings
- backend resolves known ingredients by normalized slug
- unknown ingredients are still accepted with `ingredientId = null`
- recipe responses may include optional `ingredient_id`
- carts and shopping carts still keep JSON snapshots

This is intentionally backwards-compatible.

## Why Vision Should Care

Vision output currently maps detected labels into pantry/inventory-style ingredient names.

Now backend has a more stable target:

- detector label -> canonical ingredient slug
- canonical ingredient slug -> `Ingredient.id`
- `Ingredient.id` -> inventory/profile/recipe/cart logic

This means vision does not need to guess downstream business identity forever. It can emit or map to stable ingredient identity when ready.

## Current Shared Mapping Surface

The shared mapping artifact remains:

- `packages/shared/vision-label-mappings.json`

Vision sidecar also has a deployed/local copy:

- `apps/vision-lab/vision-label-mappings.json`

Use this as the current coordination point for detector label to ingredient-name/slug mapping.

## Recommended Integration Path

### Phase 1: No Vision Runtime Change Required

Do nothing in YOLO/runtime for this backend change.

Backend will keep accepting current vision outputs as strings and can resolve known canonical names/slugs through existing ingredient flows.

### Phase 2: Emit Canonical Slugs Where Possible

When vision code is ready, prefer returning a normalized canonical slug alongside display labels.

Example shape:

```json
{
  "label": "green apple",
  "canonical_ingredient": "apple",
  "canonical_slug": "apple",
  "confidence": 0.87
}
```

Do not require `ingredient_id` from the vision sidecar yet. IDs are database-owned and environment-specific.

### Phase 3: Backend Resolves Slugs To IDs

Backend can resolve `canonical_slug` to `Ingredient.id` before writing inventory items.

This keeps vision portable across local, Supabase, Railway, and test databases.

### Phase 4: Dataset Feedback Loop Later

Eventually, user corrections can become reviewed mapping/dataset signals.

Do not auto-train from production corrections without a review/export process.

## Boundaries

This backend branch does not require changes to:

- YOLO classes
- detector checkpoints
- training scripts
- dataset import scripts
- pipeline selection
- sidecar deployment config

Please avoid modifying backend canonical ingredient behavior from a vision branch unless coordinated with Piero.

## Open Questions For Vision

- Should detector outputs standardize on `canonical_slug`?
- Which labels in `vision-label-mappings.json` are ambiguous and need manual review?
- Should sidecar expose a `/mappings` or `/labels` endpoint for debugging current label mappings?
- Should visual QA reports include canonical slug coverage?

## Backend Follow-Ups

Not done yet:

- cart aggregation does not fully group by `ingredient_id`
- ingredient alias table does not exist yet
- unresolved ingredient reporting is not implemented
- no automatic dataset/training feedback loop exists

The safe next integration point is canonical slug mapping, not direct database IDs.
