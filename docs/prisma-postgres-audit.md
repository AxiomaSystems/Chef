# Prisma / Postgres Modeling Audit

Date: 2026-05-07
Owner: papostigo
Branch: `piero/postgres-audit`

## Scope

This audit reviews the current Prisma/Postgres model for launch-readiness.

The goal is not a broad redesign. The goal is to identify schema risks, apply low-risk improvements, and document larger changes that should wait until after user testing or launch.

Reviewed surfaces:

- `apps/api/prisma/schema.prisma`
- Prisma migrations under `apps/api/prisma/migrations`
- launch-critical query paths in `apps/api/src/auth`, `apps/api/src/user`, `apps/api/src/recipe`, `apps/api/src/cart`, `apps/api/src/ingredients`, `apps/api/src/tags`, and `apps/api/src/meal-plan`

## Summary

The schema is no longer purely Mongo-style. Core product concepts are already relational:

- users
- auth identities and refresh tokens
- recipes
- cuisines
- tags
- recipe tags
- kitchen inventory
- profile memory
- pantry staples
- meal plans
- carts and shopping carts

JSON is still used heavily, but mostly in areas where the current product reads/writes whole documents rather than querying inside them:

- recipe nutrition data
- onboarding legacy preference arrays
- cart selections and dish snapshots
- ingredient review items
- shopping-cart overview and matched items
- checkout addresses and payment-card display metadata
- weekly meal-plan days

That JSON usage is acceptable for the current launch path. The risky move would be a broad normalization pass right before user testing.

## Safe Changes Applied

Added read-path indexes for per-user profile and inventory surfaces:

- `UserFoodRule(userId, strictness, createdAt)`
- `UserGoal(userId, priority, createdAt)`
- `UserPantryStaple(userId, createdAt)`
- `KitchenInventoryItem(userId, updatedAt)`

Migration:

- `apps/api/prisma/migrations/20260507010000_add_user_profile_read_indexes/migration.sql`

Why these are safe:

- no table shape changes
- no API contract changes
- no data backfill required
- indexes match existing query order/filter patterns
- failure risk is low compared with normalization or constraint changes

Linked recipe ingredient rows to canonical ingredients:

- `DishIngredient.ingredientId`
- relation to `Ingredient` with `onDelete: SetNull`
- indexes for `ingredientId` and `(baseRecipeId, ingredientId)`
- migration backfills confident matches by normalized slug
- seed flow creates canonical ingredients before recipes and links seeded recipe ingredients
- recipe API keeps `canonical_ingredient` as the required string snapshot
- recipe API can now return optional `ingredient_id`

Migration:

- `apps/api/prisma/migrations/20260508090000_link_dish_ingredients_to_ingredients/migration.sql`

Why this is safe:

- nullable column
- no destructive data changes
- no required frontend changes
- unknown ingredients remain valid with `ingredientId = null`
- cart and shopping-cart snapshots are unchanged

## Current Strong Areas

### Auth

`User.email` and `RefreshToken.tokenHash` are unique.

`AuthIdentity` uses a unique provider identity:

- `@@unique([provider, providerSubject])`

This supports password and Google auth without duplicate external identities.

### Recipe Catalog

Recipes are relational where it matters:

- `BaseRecipe`
- `Cuisine`
- `DishIngredient`
- `RecipeStep`
- `RecipeTag`

High-use recipe reads are supported by indexes:

- `BaseRecipe(ownerUserId, createdAt)`
- `BaseRecipe(isSystemRecipe, createdAt)`
- `BaseRecipe(cuisineId)`
- `RecipeTag(tagId)`
- `DishIngredient(baseRecipeId, sortOrder)`

### Cart Persistence

The `Cart` vs `ShoppingCart` split is modeled explicitly.

User list pages are supported by:

- `CartDraft(userId, createdAt)`
- `Cart(userId, createdAt)`
- `ShoppingCart(userId, createdAt)`

`IngredientReview` is one-to-one with `Cart` through `cartId @unique`, which matches the product behavior.

### Profile Memory

Profile memory is modeled better than flat preferences:

- `UserFoodRule`
- `UserGoal`
- `UserPantryStaple`

Important semantics are preserved:

- action
- strictness
- source
- confidence
- active state
- temporal range

This is the right direction for an agentic profile.

### Ownership And Cascades

Most user-owned operational data cascades on user deletion:

- auth identities
- refresh tokens
- tags
- carts
- shopping carts
- inventory
- profile memory
- meal plans

Recipe ownership uses `SetNull`, which preserves recipe/fork history instead of deleting everything on user deletion. That is defensible, but should remain intentional.

## Findings To Defer

### 1. Tag uniqueness exists in migrations, not Prisma schema

The tag migration creates partial unique indexes:

- one system tag per slug
- one user tag per owner and slug

Prisma schema cannot express these partial unique indexes directly, so they do not appear as `@@unique` in `schema.prisma`.

Current status:

- database-level protection exists if migrations were applied
- Prisma Client cannot use these partial indexes as `upsert` conflict targets
- seed/user code correctly avoids assuming a Prisma `slug_scope` unique key

Recommendation:

- keep the raw partial indexes
- document this as intentional
- do not replace with `@@unique([scope, slug])`, because that would incorrectly prevent different users from sharing the same user-tag slug

### 2. Ingredient search needs a real Postgres search strategy later

Current ingredient search uses:

- `canonicalName contains ... mode: insensitive`
- `slug contains ...`

B-tree indexes do not help much for arbitrary `contains` searches.

Options after launch:

- use `startsWith` where product behavior allows prefix search
- add `pg_trgm` and GIN trigram indexes for fuzzy/contains search
- add normalized alias rows if aliases become queryable product data

Do not add this before launch unless ingredient search performance or quality becomes a measured blocker.

### 3. Recipe ingredients now have a canonical ingredient bridge

The app already has an `Ingredient` table and important user-owned surfaces already reference it:

- `KitchenInventoryItem.ingredientId`
- `UserFoodRule.ingredientId`
- `UserPantryStaple.ingredientId`

`DishIngredient` now stores nullable `ingredientId` while keeping `canonicalIngredient` as the required string snapshot. This gives recipe ingredients a stable bridge to `Ingredient` without breaking generated/imported recipe payloads or existing frontend assumptions.

Current behavior:

- recipe create/update resolves known ingredient strings by slug
- unknown ingredient strings are still accepted with `ingredientId = null`
- saved/forked system recipes preserve existing `ingredientId`
- recipe responses may include optional `ingredient_id`
- carts and shopping carts remain JSON snapshots

Remaining work:

- improve alias resolution beyond slug matching
- optionally backfill/report unresolved ingredients as catalog quality improves
- let cart aggregation prefer `ingredient_id` where available
- keep YOLO/checkpoints/training owned by Gallo; backend should only provide stable canonical mappings

Spec:

- `docs/specs/ingredient-canonicalization.md`

### 4. Checkout profile is JSON-backed

`savedAddresses` and `paymentCards` live on `User` as JSON.

That is acceptable while checkout is prototype/display-oriented. It becomes weak once the app needs:

- address-level audit/history
- server-side validation per address
- multiple payment providers
- default address constraints at the database level
- sharing checkout data across orders

Future model:

- `UserAddress`
- `UserPaymentMethod`

Do not implement until checkout becomes a real product surface.

### 5. Cart selections and matched items are JSON snapshots

`Cart.selections`, `Cart.dishes`, `ShoppingCart.overview`, and `ShoppingCart.matchedItems` are JSON.

This is acceptable because they represent point-in-time planning/matching snapshots and are mostly read/written as whole documents.

Normalize only if the product needs:

- querying individual cart lines across users
- analytics on ingredient substitutions
- partial update concurrency by line item
- order/history reconstruction beyond the saved snapshot

### 6. Legacy onboarding preference arrays remain on `User`

The legacy onboarding fields are still mostly JSON/string fields on `User`.

This is acceptable during transition because `profile-memory` now carries richer semantics. Do not delete or normalize legacy fields until:

- Enoch's UI no longer depends on them
- account settings has a clear migration path
- profile memory is the only source of truth for rules/goals/pantry

## Findings To Monitor

### Recipe owner delete behavior

`BaseRecipe.ownerUserId` uses `onDelete: SetNull`.

This preserves recipes after user deletion, but can create orphaned user-created recipes. That may be okay for public/community recipes, but questionable for private user data.

Decision needed later:

- preserve public forks and anonymize owner
- delete private user recipes
- introduce recipe visibility before changing delete behavior

### Temporal profile memory queries

`UserFoodRule` and `UserGoal` include `active`, `startsAt`, and `expiresAt`.

Current reads fetch all rows for the user and filter active state in service code. That is fine at current scale. If users accumulate many historical rules/goals, add query-level filtering and partial indexes for active/current memory.

### JSON dates and money-like fields

Some JSON fields may contain money, nutrition, or address-like data. If those become server-calculated or business-critical, move them into typed relational columns using `Decimal`/`numeric` for money-like values instead of floats.

## Do Not Change Before Launch

- Do not normalize all onboarding fields.
- Do not split cart JSON snapshots into line-item tables.
- Do not replace profile memory with a generic key-value table.
- Do not remove legacy preference fields until frontend/account flows are migrated.
- Do not change recipe ownership delete behavior without product visibility rules.
- Do not add Redis/cache as a substitute for correct query modeling.

## Recommended Next Steps

### Before launch

- Keep this audit doc updated if additional schema fixes are made.
- Apply only small index/constraint fixes with migrations.
- Validate migrations against local Docker Postgres and Railway/Supabase target before production deploy.

### After launch

1. Decide checkout data model: keep JSON prototype or split into `UserAddress` / `UserPaymentMethod`.
2. Improve ingredient aliases/search: prefix search, trigram search, or normalized alias rows.
3. Let cart aggregation and inventory deduction prefer `ingredient_id` where available.
4. Decide recipe visibility and owner deletion policy.
5. Migrate onboarding/account settings toward profile memory as source of truth.
6. Consider typed shopping-cart line items only when analytics, concurrency, or history require it.
