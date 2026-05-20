# Cart Lifecycle

This document defines the current backend contract for `Cart` and `ShoppingCart`.

It exists because the shared Supabase database previously had a partial shopping-cart lifecycle migration applied outside the repo. The repo now owns the lifecycle contract through Prisma migration `20260520133000_cart_lifecycle_v1`.

## Source Of Truth

The source of truth is:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- `packages/shared/src/cart.ts`
- `apps/api/src/cart/`

Do not apply ad hoc schema changes directly in Supabase. If the database shape changes, the Prisma schema, migration, shared contract, API mapping, tests, and docs must move together.

## Domain Split

`Cart` and `ShoppingCart` are separate domain objects.

`Cart` answers:

- what does the user plan to cook?
- which recipes/selections are in the current plan?
- what retailer context should be used when generating purchase state?

`ShoppingCart` answers:

- what does the user need to buy?
- which retailer products/manual lines were selected?
- what is the purchase basket state before or after checkout?

The approved flow is:

```text
Recipe -> CartDraft -> Cart -> ShoppingCart
```

`CartDraft` is incomplete saved work. `Cart` is the durable planning object. `ShoppingCart` is a derived purchase snapshot.

## Cart Status

`Cart.status` is the planning lifecycle:

```ts
type CartStatus = "active" | "archived";
```

Rules:

- one user can have at most one active `Cart`
- creating a new `Cart` archives the previous active cart for that user
- archived carts remain available as history and should not be hard-deleted just to make a new plan
- `Cart.overview` is derived on read from `Cart.dishes`; it is not a persisted column

Current DB enforcement:

- `Cart_one_active_per_user_idx`
- `Cart_userId_status_updatedAt_idx`

## ShoppingCart Status

`ShoppingCart.status` is the purchase lifecycle:

```ts
type ShoppingCartStatus = "active" | "checked_out" | "archived";
```

Rules:

- one user can have at most one active `ShoppingCart`
- generating a new shopping cart archives the previous active shopping cart for that user
- checkout marks the shopping cart `checked_out`
- checked-out shopping carts are read-only for item edits
- reopening a checked-out shopping cart sets it back to `active` and archives any other active shopping cart
- `checked_out_at` records when checkout happened
- `inventory_applied_at` records when purchased items were applied to inventory

Current DB enforcement:

- `ShoppingCart_one_active_per_user_idx`
- `ShoppingCart_userId_status_updatedAt_idx`

## API Semantics

Current routes:

- `GET /api/v1/carts` returns planning carts, including active and archived carts.
- `POST /api/v1/carts` creates a new active cart and archives the user's previous active cart.
- `POST /api/v1/carts/:cartId/shopping-carts` creates a new active shopping cart and archives the user's previous active shopping cart.
- `GET /api/v1/shopping-carts` returns active shopping carts.
- `GET /api/v1/shopping-carts/history` returns full shopping-cart history.
- `PATCH /api/v1/shopping-carts/:id` updates item corrections and checkout state.

Frontend code should prefer `status` over guessing active state from missing timestamps. `checked_out_at` is still useful display/audit data, but `status` is the lifecycle flag.

## Inventory Side Effect

Checkout can add purchased items to kitchen inventory. That side effect should happen once.

The backend uses:

- `checked_out_at`: user-facing checkout timestamp
- `inventory_applied_at`: internal marker that inventory was applied

Do not infer inventory application from `checked_out_at` alone in new code.

## Migration Incident Notes

The shared Supabase database had a migration named `20260515120000_active_shopping_cart_lifecycle` applied on May 15, 2026, but that migration was not present in the repo or any remote branch when audited.

The repo reconciled that state with:

- `20260520133000_cart_lifecycle_v1`

This migration is a roll-forward reconciliation:

- creates missing lifecycle enums if absent
- adds missing lifecycle columns if absent
- backfills active/archived state
- enforces one active cart/shopping-cart per user
- keeps existing Supabase data instead of dropping unknown columns

## Contributor Rules

When changing cart lifecycle behavior:

- update Prisma schema and add a migration
- update `packages/shared/src/cart.ts`
- update API mapping/repository/service logic
- update Swagger DTOs/examples if response shape changes
- update this document and `docs/models.md`
- run focused API tests and affected builds

Do not:

- add lifecycle columns from the Supabase dashboard
- create database indexes manually without a migration
- use `checked_out_at` as the only active/history signal in new code
- make `ShoppingCart` own recipe planning state
- make `Cart` own retailer product matching state
