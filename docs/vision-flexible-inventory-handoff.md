# Vision Flexible Inventory Handoff

Date: 2026-05-08
Audience: Gallo / vision work
Branch: `piero/flexible-inventory-items`

## What Changed

Backend inventory is no longer forced to be a canonical ingredient.

`KitchenInventoryItem` now represents a user-owned inventory item:

- `displayName`: user-facing name, required.
- `normalizedName`: backend normalized name, required.
- `ingredientId`: optional canonical link to `Ingredient`.
- `reviewStatus`: `pending`, `active`, `discarded`, or `archived`.
- `label`: kept as a compatibility field.

This means the app can store things like:

- `olive oil bottle` linked to canonical `olive oil`
- `mystery green jar` with no canonical ingredient
- `container` or `bottle` as a reviewed inventory item without making it an `Ingredient`

## What Did Not Change

This branch does not change YOLO behavior.

It does not:

- add YOLO classes
- change checkpoints
- train from user input
- turn user inventory names into dataset labels
- require model outputs to use database IDs
- add `VisionObservation` yet

## Safe Integration Rule

Detector output should propose. User review should create inventory. Canonical ingredient linking should stay optional.

Production user actions are not training labels. If user corrections become useful later, they should go through a reviewed dataset export process first.

## Contract For Future Vision Output

When the vision sidecar wants to suggest inventory, prefer stable fields like:

```json
{
  "detected_label": "bottle",
  "proposed_name": "olive oil bottle",
  "canonical_slug": "olive-oil",
  "confidence": 0.42,
  "model_name": "yolo-v-next",
  "bbox": {}
}
```

Important:

- `canonical_slug` is safer than database IDs.
- `detected_label` is model evidence, not product truth.
- `proposed_name` can prefill UI, but the user can rename/discard it.
- If no canonical match exists, backend can still store the reviewed item with `ingredient_id = null`.

## Current Backend Behavior

Inventory endpoints now support:

- create freeform item with `display_name`
- create linked item with `ingredient_id`
- create/resolve by `canonical_name`
- update user-facing name via `display_name`
- update review state via `review_status`

Cart deduction:

- uses `ingredient_id` when present
- falls back by canonical/name matching only where the cart aggregation supports it
- ignores unresolved inventory items for canonical deduction

## Next Backend Phase

The next backend step should be a real `VisionObservation` table and endpoint set:

- `POST /api/v1/vision/observations`
- `GET /api/v1/vision/observations`
- `POST /api/v1/vision/observations/:id/add-to-inventory`
- `POST /api/v1/vision/observations/:id/discard`

That phase should store model metadata separately from accepted inventory.
