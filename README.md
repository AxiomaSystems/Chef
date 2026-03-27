# Cart Generator

Cart Generator is a `pnpm` monorepo for turning saved recipes into recipe-based carts and derived shopping carts.

The backend is already well past the scaffold stage, and the web app is no longer just a thin dashboard. The current product already has:

- real auth with email/password and Google login
- required onboarding
- account/settings and security
- a planning home
- a dedicated recipe library
- draft/cart creation and editing through large overlays
- persisted `CartDraft`, `Cart`, and `ShoppingCart` resources behind the internal `/api/v1` contract
- quantity controls for recipe selections in the planning composer and for line quantities in shopping carts

## What Exists Today

### Web App

The Next.js web app in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) now splits product surfaces more explicitly:

- `/` is the authenticated planning home for recent carts and drafts
- `/recipes` is the dedicated recipe library surface
- `/shopping` is the dedicated saved shopping-cart library
- recipe detail opens as a large overlay
- `Add to cart` from recipe detail opens the cart builder preloaded with that recipe
- draft creation, cart creation, draft detail, and cart detail all use large overlays instead of being the primary navigation path
- draft/cart detail overlays now support edit and delete flows
- cart detail can now generate a `ShoppingCart` and open its retailer-facing detail overlay in place
- shopping-cart detail now supports manual editing over the same persisted resource: replace matches, add manual items, delete lines, and save
- saved shopping carts can now be browsed from a dedicated `/shopping` surface
- `/account/settings/*` holds account, preferences, and security
- onboarding and account preferences now also persist a neutral `shopping_location` block (manual first, GPS-ready later)

### API

The NestJS API in [apps/api](/C:/Users/akuma/repos/cart-generator/apps/api) currently supports:

- user and admin identities in the database
- real auth endpoints for email/password, Google login, refresh, logout, and `/me`
- `/api/v1/me/preferences` for auth-backed cuisine and tag preferences
- `/api/v1/me/preferences` also carries a neutral `shopping_location` profile block
- `shopping_location` now also supports `kroger_location_id` so future store reuse can skip repeated location resolution
- `/api/v1/me/onboarding/complete` for explicit onboarding completion
- a global controlled cuisine catalog exposed at `/api/v1/cuisines`
- hybrid tags with explicit `/api/v1/tags` endpoints
- global system recipes and user-owned recipes
- recipe CRUD for user-owned recipes
- optional `cover_image_url` and `nutrition_data` on recipes
- explicit dietary badge tags through `Tag.kind = dietary_badge`
- an explicit fork flow for copying a system recipe into a user-owned editable recipe
- persisted `cart-drafts`, `carts`, and `shopping-carts`
- deterministic conversion from recipe selections into recipe-based carts
- persisted retailer context on drafts and carts
- derived aggregated ingredient overviews on cart reads
- deterministic ingredient aggregation and provider-backed retailer matching behind shopping-cart generation
- a mock retailer provider for local/dev fallback
- a real Kroger provider for live location lookup and product search
- a Walmart provider boundary that remains available but inactive by default
- retailer product search and shopping-cart editing APIs behind the same shopping-cart boundary
- rule-based grocery matching refinement for produce/plain pantry items and honest no-match handling for specialty ingredients
- internal `/api/v1` route families for `recipes`, `recipe-forks`, `cart-drafts`, `carts`, and `shopping-carts`
- internal `/api/v1/tags` for visible system tags and user-owned tags
- Swagger UI at `/docs`
- request tracing via `x-request-id`

### Shared Package

[packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared) contains the current TypeScript domain contracts for:

- recipes
- cuisines
- selection and cart models
- aggregation
- matching
- users

### Database and Infra

The API uses Prisma + PostgreSQL.

- Prisma schema: [apps/api/prisma/schema.prisma](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/schema.prisma)
- Migrations: [apps/api/prisma/migrations](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/migrations)
- Seed data: [apps/api/prisma/seed](/C:/Users/akuma/repos/cart-generator/apps/api/prisma/seed)
- Local Docker stack: [infra/docker/docker-compose.yml](/C:/Users/akuma/repos/cart-generator/infra/docker/docker-compose.yml)

### Documentation

The main architecture and design notes live in:

- [docs/architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md)
- [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md)
- [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md)

Those docs now describe the implemented `v1` direction, the current web product state, and the next product/backend milestones.

## Repository Layout

```text
cart-generator/
|-- apps/
|   |-- api/
|   `-- web/
|-- docs/
|-- infra/
|   `-- docker/
|-- packages/
|   `-- shared/
|-- package.json
|-- pnpm-lock.yaml
`-- pnpm-workspace.yaml
```

## Workspace Commands

Install dependencies:

```bash
pnpm install
```

Run both apps:

```bash
pnpm dev
```

Run one app:

```bash
pnpm dev:api
pnpm dev:web
```

Build the workspace:

```bash
pnpm build
```

Run workspace checks:

```bash
pnpm lint
pnpm test
pnpm typecheck
```

## Local API Setup

Root shortcuts:

```bash
pnpm api:setup
pnpm api:up
pnpm api:reset
```

What they do:

- `pnpm api:setup`
Prepares the local backend without starting the server.
Starts Postgres, generates Prisma client, applies existing migrations, and seeds local data.

- `pnpm api:up`
Starts Postgres if needed and then runs the API in dev mode.

- `pnpm api:reset`
Destructive.
Resets the local API database, reapplies migrations, and reruns seed through Prisma.

Start PostgreSQL:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Apply migrations:

```bash
cd apps/api
pnpm prisma:migrate:dev
```

Seed the database:

```bash
pnpm db:seed
```

Start the API:

```bash
pnpm start:dev
```

Recommended first-time local flow:

```bash
pnpm api:setup
pnpm api:up
```

Useful API commands:

```bash
pnpm build
pnpm test --runInBand
pnpm test:e2e
pnpm test:e2e:ci
pnpm prisma:generate
pnpm prisma:studio
```

Swagger:

- UI: [http://localhost:3001/docs](http://localhost:3001/docs)
- OpenAPI JSON: [http://localhost:3001/docs/openapi.json](http://localhost:3001/docs/openapi.json)

## Current Product Rules

- system recipes are global and immutable
- user-created recipes are private by default
- unauthenticated recipe reads only see global system recipes
- authenticated users see global recipes plus their own recipes
- writes require authentication
- `/api/v1/me` is the authenticated profile boundary
- cuisines are now explicit global resources with `kind`-based curation
- recipe writes now use `cuisine_id`, and recipe reads return both `cuisine_id` and expanded `cuisine`
- tags are now explicit resources with `system` and `user` scope
- tags now also carry `kind`, so dietary badges like `halal`, `vegan`, and `gluten-free` are explicit curated system tags with `kind = dietary_badge`
- recipe writes now use `tag_ids`, and recipe reads return both `tag_ids` and expanded `tags`
- forking a system recipe creates a user-owned editable copy
- duplicate forks of the same source recipe are prevented per user
- `CartDraft` is editable incomplete intent, not the main product object
- `Cart` is the stable recipe-based meal plan snapshot with retailer context and a derived ingredient overview
- `ShoppingCart` is the retailer-facing basket derived from a `Cart`
- aggregation and retailer matching remain deterministic
- `ShoppingCart` can now be manually corrected without regenerating a new planning artifact
- dietary badges should come from tag metadata, not hardcoded booleans on recipes
- `nutrition_data` is optional recipe detail metadata, not something every compact recipe card needs to show
- generating a cart from an existing draft should consume that draft so recent work does not duplicate the same planning run

## Live API Shape

The clean internal `v1` contract is now the implemented direction under `/api/v1`.

Resource families:

- `recipes`
- `recipe-forks`
- `cart-drafts`
- `carts`
- `shopping-carts`

Approved conceptual flow:

```text
Recipe -> CartDraft -> Cart -> ShoppingCart
```

Interpretation:

- `CartDraft` is editable user intent
- `Cart` is the stable recipe-based meal plan snapshot with retailer context and derived ingredient overview
- `ShoppingCart` is the retailer-facing purchase basket derived from a `Cart`

This separation is intentional:

- `Cart` answers "what do I want to cook?"
- `ShoppingCart` answers "what do I need to buy?"
- retailer matching and purchasable-product state still belong behind `ShoppingCart`
- real auth and future tags should be built on top of this API shape, not by reshaping it again

## What Changed Recently

- `/api/v1` is now the active internal API contract.
- auth persistence now includes `AuthIdentity` and `RefreshToken`.
- cuisine persistence now includes a global `Cuisine` catalog.
- tags persistence now includes `Tag` and `RecipeTag`.
- `/api/v1/auth/register`, `/login`, `/google`, `/refresh`, `/logout`, `GET /me`, and `PATCH /me` are implemented.
- `/api/v1/cuisines` now exposes the global cuisine catalog.
- `/api/v1/me/preferences` now supports read/replace for user cuisine and system-tag preferences.
- `/api/v1/me/preferences` now also supports `shopping_location` (`zip_code`, `label`, `latitude`, `longitude`, `kroger_location_id`) for future store resolution and location reuse.
- `/api/v1/me/onboarding/complete` now marks onboarding completion independently from preferences.
- `/api/v1/tags` now supports list/create/update/delete.
- `/api/v1/tags` now returns `kind` so clients can distinguish general taxonomy tags from dietary badge tags.
- `POST /api/v1/recipe-forks` replaced the old save-style route.
- recipes now require `cuisine_id` and return expanded `cuisine` objects.
- carts now require `retailer` on write and return derived `overview` ingredient data on read.
- `cart-drafts`, `carts`, and `shopping-carts` are separate resources in API, shared models, and database schema.
- Prisma migration `20260319113000_split_cart_and_shopping_cart_v1` materializes the new `Cart`/`ShoppingCart` split.
- Prisma migration `20260319124500_add_cuisine_catalog` materializes the controlled cuisine catalog and recipe relation.
- Prisma migration `20260321130500_add_cart_retailer` materializes retailer persistence on `Cart`.
- the web app dashboard in [apps/web](/C:/Users/akuma/repos/cart-generator/apps/web) now reads the `/api/v1` endpoints and reflects the new model vocabulary.
- the web app now separates planning home from recipe browsing: `/` focuses on planning state and recent work, while `/recipes` owns the recipe library.
- `/recipes` now has recipe detail overlays with ingredients, steps, and `nutrition_data`
- recipe detail now uses `Add to cart` instead of creating drafts immediately
- the cart builder is now the central planning composer, and drafts are treated as secondary persistence for incomplete work
- draft/cart detail overlays now support edit flows by reopening the same composer with hydrated selections, retailer, and name
- draft/cart detail overlays now support delete flows
- generating a cart from an existing draft now deletes that draft after successful cart creation
- cart detail now supports `Generate shopping cart`, which opens a retailer-facing shopping-cart detail overlay on top of the same workspace
- shopping-cart detail now supports manual correction on the same persisted resource
- `/api/v1/retailers/:retailer/products/search` now exposes provider-backed product search behind the shopping-cart editor
- the matching module now supports `MockRetailerProductProvider`, `KrogerRetailerProductProvider`, and `WalmartRetailerProductProvider`
- Kroger is now the first live retailer path, using the user's shopping location to resolve a nearby store before product search
- the Kroger provider now deduplicates concurrent token fetches, throttles uncached search bursts, and caches locations/query results to reduce burst traffic
- new API envs:
  - `WALMART_USE_REAL_PROVIDER=true|false`
  - `WALMART_CLIENT_ID`
  - `WALMART_CLIENT_SECRET`
  - `WALMART_ENV=sandbox|production`
- additional API envs:
  - `KROGER_USE_REAL_PROVIDER=true|false`
  - `KROGER_CLIENT_ID`
  - `KROGER_CLIENT_SECRET`
- `PATCH /api/v1/shopping-carts/:id` now persists manual shopping-cart edits
- shopping-cart editing now supports manual line items, replacing matches, deleting lines, and changing `selected_quantity`
- draft/cart editing now supports per-recipe quantities, so the same dish can appear multiple times in one planning run

## Upcoming Work

The next high-signal work is now more product-shaped than before.

1. Add GPS-assisted shopping-location setup on top of the current manual `shopping_location` profile block.
2. Persist and reuse resolved Kroger store ids more explicitly in UX so the app stops re-resolving locations whenever possible.
3. Keep improving grocery matching quality with more ingredient query planning, synonym maps, and stronger produce/pantry heuristics.
4. Add a clearer draft -> cart conversion affordance inside draft detail, beyond the generic composer action.
5. Expand recipe library actions with `Fork/Edit` and a stronger owner/system distinction in the UI.
6. Harden Google OAuth and retailer credential handling for production deployment.

## Current Gaps

- recipe variants and AI-assisted adaptation are not implemented yet
- the Walmart provider boundary exists, but the first live retailer path is now Kroger
- delete flows exist, but recovery/versioning does not
- drafts and carts can now be edited, but there is still no broader history/timeline model for planning runs
- shopping-cart history exists in API and `/shopping`, but revisit/history tools are still fairly light
- store resolution is still manual-first; GPS capture and explicit saved-store management are not in UX yet

## Practical Reading Guide

If you want the current truth of the system:

1. Read [docs/architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md) for the layered system and the approved `Cart` vs `ShoppingCart` split.
2. Read [docs/decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md) for the policy and API-shape decisions.
3. Read [docs/models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md) for the conceptual model vocabulary.
4. Read Swagger at `/docs` for the live implemented `/api/v1` contract.
