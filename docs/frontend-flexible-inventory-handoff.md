# Frontend Flexible Inventory Handoff

Date: 2026-05-08
Audience: Enoch / frontend UI
Branch: `piero/vision-observations-api`

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

## Vision Observation API

There is now a persisted `VisionObservation` API.

Create observation:

```http
POST /api/v1/vision/observations
```

```json
{
  "detected_label": "bottle",
  "proposed_name": "olive oil bottle",
  "canonical_slug": "olive-oil",
  "detector_model": "yolo-v-next",
  "confidence": 0.82,
  "bbox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4 },
  "raw_payload": {}
}
```

List observations:

```http
GET /api/v1/vision/observations
```

Add reviewed observation to inventory:

```http
POST /api/v1/vision/observations/:id/add-to-inventory
```

```json
{
  "display_name": "olive oil bottle",
  "estimated_amount": 1,
  "unit": "bottle"
}
```

Discard reviewed observation:

```http
POST /api/v1/vision/observations/:id/discard
```

Use this for review cards: create/hold observation evidence, then add or discard after user confirmation.

## Current Web Bridge

`apps/web/src/app/inventory/vision-scan-modal.tsx` now persists a `VisionObservation` before adding a reviewed detection/group to inventory.

The bridge intentionally does not redesign the modal. It preserves the existing add buttons and routes them through:

1. `POST /api/v1/vision/observations`
2. `POST /api/v1/vision/observations/:id/add-to-inventory`
3. `GET /api/v1/me/kitchen-inventory` to return the created item to the existing UI state

This gives backend a review/audit trail without changing Gallo's detector or forcing Enoch into a UI rewrite.
