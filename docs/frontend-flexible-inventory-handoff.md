# Frontend Flexible Inventory Handoff

Date: 2026-05-08
Audience: Enoch / frontend UI
Branch: `piero/flexible-inventory-items`

## What Changed

Inventory items are now flexible user-owned rows, not always canonical ingredients.

Frontend should treat these fields as the display contract:

```ts
type KitchenInventoryItem = {
  id: string;
  user_id: string;
  ingredient_id?: string;
  ingredient?: Ingredient;
  display_name: string;
  normalized_name: string;
  label?: string;
  estimated_amount?: number;
  unit?: string;
  source: "manual" | "vision" | "receipt" | "cart" | "inferred" | "seed";
  confidence: "low" | "medium" | "high";
  review_status: "pending" | "active" | "discarded" | "archived";
  created_at: string;
  updated_at: string;
};
```

Use `display_name` as the primary visible name.

Use `ingredient?.canonical_name` only as secondary metadata when present.

Do not assume `ingredient_id` or `ingredient` exists.

## Create Inventory Items

Existing paths still work:

```json
{
  "ingredient_id": "ingredient-rice",
  "estimated_amount": 1,
  "unit": "cup"
}
```

New freeform path:

```json
{
  "display_name": "mystery green jar",
  "estimated_amount": 1,
  "unit": "unit"
}
```

Suggested vision review path for now:

```json
{
  "display_name": "olive oil bottle",
  "label": "olive oil bottle",
  "review_status": "active"
}
```

If UI has a confident canonical ingredient selected by the user, include `ingredient_id`.

## Update Inventory Items

`PATCH /api/v1/ingredients/inventory/:id` can update:

- `display_name`
- legacy `label`
- `estimated_amount`
- `unit`
- `review_status`

Use `review_status: "discarded"` or `"archived"` to hide an item from the active inventory list without deleting it.

The inventory list endpoint returns `pending` and `active` items only.

## UI Implications

Recommended rendering:

- title: `display_name`
- subtitle: canonical ingredient name if available
- status badge: show `pending` only when needed
- unresolved item: do not show it as broken; this is valid product state

For vision scan review:

- prefill `display_name` from the best vision guess
- let the user rename before adding
- let the user discard
- only attach `ingredient_id` when the user explicitly picks or confirms a canonical match

## What Is Not Ready Yet

There is no persisted `VisionObservation` API yet.

The current backend supports reviewed inventory items, but not a full observation audit trail. Until Phase 2 exists, frontend can still create/update inventory rows directly after review.
