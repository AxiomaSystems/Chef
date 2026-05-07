# Frontend UI Handoff - Backend/API Stabilization

Date: 2026-05-06

Audience: UI engineer / frontend owner

Purpose: make it easy to fix frontend 404s and contract drift caused by the backend/API stabilization work.

This is not a product spec. It is a practical handoff for reconnecting the current web app to the backend that exists now.

## Why This Handoff Exists

During backend stabilization we changed or formalized:

- route families under `/api/v1`
- auth expectations
- provider/readiness behavior
- planning/cart/shopping-cart flow boundaries
- onboarding/profile-memory surfaces

The current frontend already uses many of the right endpoints, but some pages and actions can still drift into 404s or stale assumptions.

This doc tells you:

1. what backend routes are now the source of truth
2. which frontend files are most likely to need review
3. what old assumptions to remove
4. how to validate the fixes quickly

## Global Frontend Assumptions To Keep

### API base

Confirmed in:

- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/api.ts`

Current default local backend base:

```text
http://localhost:3001/api/v1
```

Frontend API helpers already assume that page/action code passes paths like:

```text
/recipes
/me
/cart-drafts/:id
```

So do **not** hardcode `/api/v1` again inside action files.

### Auth

The backend no longer expects the old temporary `x-user-id` workflow.

Current expectation:

- bearer auth via access token cookie
- authed server actions call API with `Authorization: Bearer <token>`

If a screen still assumes header-based fake auth, remove that assumption.

## Backend Route Families That Are Now Canonical

These are the route families the frontend should treat as real.

### Auth / profile

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `GET /me/stats`
- `GET /me/preferences`
- `PUT /me/preferences`
- `GET /me/checkout-profile`
- `PUT /me/checkout-profile`
- `GET /me/profile-memory`
- `PATCH /me/profile-memory`
- `POST /me/onboarding/complete`
- `POST /me/password/change`
- `POST /me/password/set`

### Planning

- `GET /recipes`
- `GET /recipes/:id`
- `PATCH /recipes/:id`
- `DELETE /recipes/:id`
- `POST /recipes`
- `POST /recipe-forks`
- `GET /cart-drafts`
- `GET /cart-drafts/:id`
- `POST /cart-drafts`
- `PATCH /cart-drafts/:id`
- `DELETE /cart-drafts/:id`
- `GET /carts`
- `GET /carts/:id`
- `POST /carts`
- `PATCH /carts/:id`
- `DELETE /carts/:id`
- `GET /carts/:id/ingredient-review`
- `PUT /carts/:id/ingredient-review`

### Shopping / retailer

- `POST /carts/:cartId/shopping-carts`
- `GET /shopping-carts`
- `GET /shopping-carts/:id`
- `GET /shopping-carts/history`
- `PATCH /shopping-carts/:id`
- `DELETE /shopping-carts/:id`
- `GET /retailers/capabilities`
- `GET /retailers/:retailer/products/search?query=...`

### Inventory

- `POST /carts/restock`
- `GET /ingredients`
- `GET /me/kitchen-inventory`
- `POST /me/kitchen-inventory`
- `DELETE /me/kitchen-inventory/:id`

### Meal plan / AI / vision

- `GET|PUT /meal-plans`
- `/ai/*`
- `/vision/*`

## Frontend Files To Review First

These are the most important files surfaced during the audit.

### 1. Planning flow

File:

- `apps/web/src/app/home-actions.ts`

This file currently drives:

- create draft
- update draft
- create cart
- update cart
- promote draft to cart
- create shopping cart from cart
- retailer product search
- shopping-cart patch/delete
- recipe fork/create/update/delete

Routes already used here that match current backend:

- `/cart-drafts`
- `/cart-drafts/:id`
- `/carts`
- `/carts/:id`
- `/carts/:id/shopping-carts`
- `/retailers/:retailer/products/search`
- `/shopping-carts/:id`
- `/recipe-forks`
- `/recipes`
- `/recipes/:id`

#### Frontend risks to review in this file

- error handling still assumes generic failures in some places
- cart generation now returns more explicit provider/location errors and UI should preserve/show them
- retailer search now depends on provider readiness more explicitly
- `matched_items` payload on `PATCH /shopping-carts/:id` must stay aligned with shared types

### 2. Account settings

File:

- `apps/web/src/app/account/actions.ts`

Routes used:

- `/me`
- `/me/preferences`
- `/me/password/change`
- `/me/password/set`
- `/me/checkout-profile`

#### Important current payload expectation

Preferences write shape includes:

```json
{
  "preferred_cuisine_ids": [],
  "preferred_tag_ids": [],
  "shopping_location": {
    "zip_code": "",
    "label": "",
    "kroger_location_id": ""
  }
}
```

If the UI is still writing an older shape, fix it here first.

### 3. Onboarding

File:

- `apps/web/src/app/onboarding/actions.ts`

Routes used:

- `PATCH /me/profile-memory`
- `POST /me/onboarding/complete`

#### Important note

Onboarding is no longer just preferences persistence.

It now writes profile memory plus explicit onboarding completion. If the UI assumes that saving preferences alone completes onboarding, that assumption is stale.

### 4. Inventory

File:

- `apps/web/src/app/inventory/actions.ts`

Routes used:

- `POST /carts/restock`
- `POST /me/kitchen-inventory`
- `DELETE /me/kitchen-inventory/:id`

#### Important note

`/carts/restock` is action-like but still valid in current backend. Do not rename it in frontend unless backend changes too.

### 5. Draft detail screen

File:

- `apps/web/src/app/drafts/[id]/page.tsx`

Routes used:

- `GET /cart-drafts/:id`
- `GET /recipes`

This page should remain valid, but it is a good canary for planning-state hydration.

### 6. Shared fetch helpers

Files:

- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/api.ts`

If many screens are 404ing, verify helpers first before editing each page.

## Old Assumptions To Remove

### 1. `demo/2` is the stable backend branch

No longer the intended baseline.

Use `main` as the stable reference going forward.

### 2. `x-user-id` fallback is acceptable

No longer true for normal app flows.

Frontend should assume bearer-token auth.

### 3. Provider availability is a hidden backend detail

No longer true.

Backend now exposes retailer capability/readiness more clearly, and user-facing errors are more explicit.

### 4. Preferences and onboarding are the same thing

No longer true.

Onboarding completion is explicit, and profile-memory writes are part of that flow.

## Likely 404 / Mismatch Areas

If the frontend is currently failing, these are the first places I would check.

### A. Any stale old save/fork route

Current canonical route:

- `POST /recipe-forks`

If any UI code still uses a legacy save-system-recipe route, change it to this.

### B. Any page still hitting outdated profile or onboarding paths

Current canonical routes:

- `/me/preferences`
- `/me/profile-memory`
- `/me/onboarding/complete`

### C. Any shopping flow that assumes shopping cart generation is a recipe-level action

Current canonical generation route:

- `POST /carts/:cartId/shopping-carts`

### D. Any retailer UI that assumes all retailers support the same operations

Current capability discovery route:

- `GET /retailers/capabilities`

Use this to decide which controls to show or hide later.

### E. Any silent handling of provider/location failures

Current backend behavior is deliberately explicit.

Frontend should preserve and display errors such as:

- missing shopping location
- missing provider credentials
- unavailable retailer search/handoff

## Recommended Repair Order For The UI Engineer

### Step 1: verify shared API helpers

Check:

- `buildApiUrl()`
- authed fetch helper behavior
- token cookie presence

### Step 2: fix the planning spine first

Review and test:

- `apps/web/src/app/home-actions.ts`

Specifically validate:

- save draft
- create cart
- update cart
- generate shopping cart
- search retailer products
- patch shopping cart

### Step 3: fix profile + onboarding shape drift

Review and test:

- `apps/web/src/app/account/actions.ts`
- `apps/web/src/app/onboarding/actions.ts`

### Step 4: fix inventory

Review and test:

- `apps/web/src/app/inventory/actions.ts`

### Step 5: review read-only detail pages

Good sanity screens:

- draft detail
- shopping library/detail
- account settings loaders

## Quick Validation Checklist

This is the fastest pass I would run after the fixes.

### Auth/profile

- login works
- `/me` loads
- `/me/stats` loads
- preferences save works
- checkout profile save works

### Onboarding

- onboarding save writes profile memory
- onboarding complete clears the gating state
- skip onboarding still completes the flow cleanly

### Planning

- browse recipes works
- save system recipe fork works
- save draft works
- edit draft works
- generate cart works
- edit cart works

### Shopping

- generate shopping cart from cart works
- missing location shows explicit backend error
- missing credentials show explicit backend error
- retailer product search works when provider is available
- shopping-cart patch persists manual edits
- shopping-cart delete works
- shopping-cart history loads

### Inventory

- add kitchen item works
- delete kitchen item works
- create restock cart works

## Suggested Follow-Up Docs Or TODOs

After the UI engineer fixes the 404s, I would recommend:

1. create one small frontend/backend integration checklist for `/recipes -> cart -> shopping`
2. optionally add one frontend smoke-test doc for launch-critical paths
3. later make retailer UI capability-aware using `/retailers/capabilities`

## Bottom Line

The most important frontend reconnect points are:

- planning actions in `home-actions.ts`
- account/onboarding payload shape
- inventory action routes
- shared fetch helpers

The backend is now more explicit than before.

That is good for stability, but it means the frontend should stop guessing and align directly with the current route families and payloads above.
