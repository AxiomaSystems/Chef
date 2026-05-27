# Meal Plan Frontend Handoff

Owner context: backend/platform owns the Meal Plan contract. Frontend can redesign the UX/UI, but should keep this data model and endpoint wiring.

## Current Contract

Meal Plan is no longer a rigid `7 days x breakfast/lunch/dinner` UI model.

The backend model is flexible `MealEvent` records:

- any date range
- any number of meals per day
- labels: `breakfast`, `lunch`, `dinner`, `snack`, `prep`, `leftover`, `custom`
- source types: `recipe`, `manual`, `leftover`, `eat_out`, `prep`
- statuses: `planned`, `cooked`, `eaten`, `skipped`
- optional recipe, custom label, notes, servings, locked flag

Shared TypeScript types live in:

- `packages/shared/src/meal-plan.ts`

## Frontend Entry Points

The current Next.js page consumes the real backend endpoints.

- `apps/web/src/app/meal-plan/page.tsx`
  - SSR loads recipes with `GET /api/v1/recipes?limit=100`
  - SSR loads the current week with `GET /api/v1/meal-plans?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - SSR loads profile nutrition targets with `GET /api/v1/me/preferences`

- `apps/web/src/app/meal-plan/actions.ts`
  - wraps all Meal Plan mutations as server actions
  - attaches the auth bearer token through `buildApiUrl`
  - revalidates `/meal-plan` after mutations

- `apps/web/src/components/meal-plan.tsx`
  - renders the current UI
  - can be redesigned, but should keep calling the actions above

## Endpoint Usage

Use these endpoints from the server action layer, not directly from client components.

### Load Range

```http
GET /api/v1/meal-plans?from=2026-05-18&to=2026-05-24
```

Returns `MealPlanRange`:

- `from`
- `to`
- `days[]`
- `events[]`
- `grocery_summary`
- `nutrition_summary`

The UI should render from `days[].events`, not from fixed breakfast/lunch/dinner slots.

### Add Event

```http
POST /api/v1/meal-events
```

Recipe event example:

```json
{
  "date": "2026-05-21",
  "meal_label": "dinner",
  "source_type": "recipe",
  "recipe_id": "recipe_id_here",
  "title": "Lemon Herb Salmon",
  "servings": 2
}
```

Manual event example:

```json
{
  "date": "2026-05-21",
  "meal_label": "custom",
  "custom_label": "Post-workout",
  "source_type": "manual",
  "title": "Protein smoothie",
  "servings": 1,
  "notes": "Use almond milk",
  "status": "planned"
}
```

### Update Event

```http
PATCH /api/v1/meal-events/:id
```

Use this for:

- changing date
- changing label/custom label
- changing servings
- changing status
- swapping a recipe
- turning a recipe event into a manual event

To clear a recipe from an event, send `"recipe_id": ""`.

### Delete Event

```http
DELETE /api/v1/meal-events/:id
```

### Generate Active Cart From Plan

```http
POST /api/v1/meal-plans/cart
```

Example:

```json
{
  "from": "2026-05-18",
  "to": "2026-05-24",
  "event_ids": ["meal_event_id_1", "meal_event_id_2"],
  "retailer": "kroger",
  "mode": "replace_active"
}
```

Only recipe-backed events should be included in `event_ids` for cart generation. Manual/eat-out/prep events do not have ingredients.

## UX Rules For Redesign

- Mobile is primary, desktop still supported.
- Do not rebuild a fixed three-row meal grid as the source of truth.
- Day view should work well with one hand on mobile.
- Week view can be a denser desktop/tablet planning surface.
- Month view should be overview-only: small pills, counts, and day drill-in. Do not try to show full cards in month cells.
- Add/edit should support both recipe-backed events and manual events.
- Manual event types should cover at least: manual, eat out, leftover, prep.
- Status changes should remain lightweight because the execution flow will matter later for Chef chat and hands-free cooking.

## Backend Guarantees

The backend owns:

- user scoping
- date range reads
- event persistence
- recipe hydration
- grocery aggregation
- nutrition aggregation
- active cart creation from selected recipe events

The frontend should not recompute grocery/nutrition summaries as the source of truth. It can display backend summaries and use local UI state only for temporary controls such as checked grocery rows or selected cart events.

## Deferred Work

Not part of this slice:

- Chef agentic meal-plan generation
- monthly generation
- collaborative household planning
- drag/drop persistence
- pantry-aware generation

Those should build on the same `MealEvent` contract later.
