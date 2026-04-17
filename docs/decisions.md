# Engineering Decisions - Cart Generator

This document records the main system decisions behind the project.

## 1. Stateful System Over Stateless Generation

Decision:
- operate on persistent user-owned recipes instead of generating everything from scratch

Why:
- users repeat meals
- persistence improves consistency
- historical data enables future optimization

Trade-off:
- database modeling is required early

## 2. LLM as Transformation Layer

Decision:
- use AI only to transform structured inputs

Allowed:
- recipe adaptation
- structured generation
- ingredient interpretation when needed

Not allowed:
- aggregation
- pricing
- product matching
- orchestration

Why:
- deterministic logic must remain reproducible and debuggable

## 3. Base Recipes and Variants Are Separate

Decision:
- keep immutable base recipes separate from derived variants

Why:
- preserves the original recipe
- supports caching
- supports auditability of transformations

## 4. Aggregation Must Be Deterministic

Decision:
- ingredient aggregation is pure system logic

Why:
- quantity math must be correct
- behavior must be testable

## 5. Culinary and Retail Domains Stay Separate

Decision:
- keep recipe ingredients and purchasable products in different models

Why:
- culinary data and retail data evolve differently
- matching is an explicit mapping problem

## 6. Product Matching Is Score-Based

Decision:
- use deterministic scoring rather than AI to select products

Why:
- price selection needs consistency
- scoring logic is easier to inspect and tune

Typical signals:
- name similarity
- size compatibility
- price efficiency
- ingredient-specific semantic rules
- explicit no-match when the catalog lacks a reasonable candidate

## 7. Canonical Ingredient Naming Is Required

Decision:
- normalize ingredients to canonical identifiers before aggregation and matching

Why:
- prevents duplicate identities for the same ingredient
- improves matching accuracy

Example:

```text
"chicken breast" -> canonical key
"boneless chicken breast" -> display label
```

## 8. Monorepo With Shared Contracts

Decision:
- keep web, api, and shared types in one pnpm workspace

Why:
- reduces schema drift
- speeds up iteration

## 9. NestJS for the Backend

Decision:
- use NestJS modular architecture

Why:
- clear separation of concerns
- better long-term maintainability than an ad hoc server

## 10. PostgreSQL for Persistence

Decision:
- use a relational database

Why:
- the system has strong entity relationships
- structured querying matters

## 11. Redis For Async And Caching Later

Decision:
- use Redis later for caching and background jobs

Why:
- LLM calls and matching workflows can become expensive

## 12. Docker For Local Infra

Decision:
- run local infrastructure through Docker

Why:
- consistent onboarding
- reproducible local environments

## 13. Build The Pipeline Before The UI

Decision:
- prioritize backend workflow and data contracts before frontend complexity

Why:
- the product's core value is the cart-generation pipeline

## 14. Mock Retailer First

Decision:
- start with a mock product catalog before real retailer integrations

Why:
- avoids early third-party API complexity
- lets matching logic be developed in isolation

Current status:
- the mock-first decision is still the default runtime path
- the codebase now has a general retailer-provider boundary, with Kroger as the first live path and Walmart still available behind config for later

## 15. Avoid Premature Complexity

Decision:
- delay microservices, multi-retailer support, and advanced optimization

Why:
- the MVP still needs a working vertical slice

## 16. System Recipes Are Global And Immutable

Decision:
- `isSystemRecipe = true` means a recipe is global catalog content, not user-owned content
- the intended invariant is:
  - system recipe -> `ownerUserId = null`
  - user recipe -> `ownerUserId != null`

Why:
- avoids contradictory ownership semantics
- makes visibility and edit rules easier to reason about

Note:
- if a system recipe appears with an owner, that should be treated as bad data or a migration issue, not valid long-term state

## 17. User-Created Recipes Are Private By Default

Decision:
- recipe creation should produce recipes visible only to the owning user
- other users should not see those recipes unless an explicit sharing model is introduced later

Why:
- privacy is the safer default
- most user-authored recipes are personal working data
- public sharing needs its own product decisions and moderation rules

Implication:
- for API testing and future auth flows, we should think in at least four personas:
  - authenticated user A
  - authenticated user B
  - authenticated admin
  - unauthenticated user

## 18. Saving A System Recipe Should Create An Editable User Copy

Decision:
- do not allow direct editing of system recipes
- use an explicit save/fork flow that copies a system recipe into the user's editable library

Approved API shape:
- `POST /api/v1/recipe-forks`
- request body includes `source_recipe_id`
- resulting record is:
  - `isSystemRecipe = false`
  - `ownerUserId = currentUserId`
  - `forkedFromRecipeId = originalSystemRecipeId`

Why:
- preserves catalog integrity
- lets users customize recipes freely
- creates a clean boundary between canonical content and personal content

## 19. Recipe Steps Stay Normalized

Decision:
- keep steps in a separate `RecipeStep` table
- recipe update should continue accepting `steps` as full-array replacement for now

Why:
- step order matters
- steps are structured content, not a scalar field
- future step-level editing is easier from a normalized model than from a single column blob

Not recommended:
- moving steps into a single JSON/text column just for update convenience

## 20. Tags Should Become Hybrid, Not Just String Arrays

Decision:
- the current `String[]` tags column is acceptable for MVP seeding and filtering
- the longer-term model should move to hybrid tags with explicit scope

Recommended direction:
- `Tag`
  - `id`
  - `name`
  - `slug`
  - `scope: system | user`
  - `ownerUserId?`
- `RecipeTag`
  - `recipeId`
  - `tagId`

Interpretation:
- system tags are shared taxonomy for everyone
- user tags are private organizational labels unless we later introduce sharing

Why:
- tags need better deduplication and filtering than raw strings
- shared taxonomy and private organization are different concerns
- hybrid tags support both discovery and personal workflow

Status:
- implemented in persistence and via `/api/v1/tags`
- dietary badges should piggyback on curated system tags instead of new boolean columns
- `Tag.kind` should distinguish general taxonomy tags from dietary badge tags without splitting tags into another table
- recipes now accept `tag_ids` on write and return expanded `tags` on read

## 21. Recipe Browsing Should Be Separate From Planning Home

Decision:
- keep `/` focused on planning state, drafts, carts, and recent work
- keep recipe exploration in a dedicated `/recipes` surface

Why:
- recipe discovery and active planning are different jobs
- mixing both on the same page made the home noisy and semantically confused
- `New draft` can still open an overlay from home without turning the homepage into the recipe library again

## 21.5. Saved ShoppingCarts Should Also Have Their Own Surface

Decision:
- keep saved shopping carts in a dedicated `/shopping` surface instead of burying them inside home or account

Why:
- revisiting retailer outputs is a separate job from planning and separate again from recipe exploration
- a dedicated surface makes saved purchase baskets searchable and editable without contaminating the planning home
- this keeps `Home`, `Recipes`, and `Shopping` as three clear workspace modes

## 22. Drafts Are Secondary, Carts Are Primary

Decision:
- treat `CartDraft` as incomplete saved work
- treat `Cart` as the primary planning object once a run is generated

Why:
- drafts are useful, but they should not dominate the product language
- users care more about the meal plan they are converging toward than the persistence mechanism for unfinished work
- this keeps the UI centered on "build cart" and "continue planning", not on draft management as a product concept

Implications:
- recipe detail should say `Add to cart`, not `Add to draft`
- the main composer should prioritize cart creation
- `Save draft` should remain available as a secondary action
- generating a cart from an existing draft should delete that draft by default

## 23. One Composer Should Handle Create And Edit For Planning State

Decision:
- reuse one large planning overlay to create drafts, create carts, edit drafts, and edit carts

Why:
- name, retailer, and recipe selections are the same conceptual editing surface
- separate create/edit UIs would drift quickly
- overlays preserve workspace continuity better than page navigation for this product

Implications:
- draft detail and cart detail should reopen the same composer in edit mode
- the composer must support hydrated selections, name, retailer, and resource identity
- save semantics can vary by mode, but the interface stays shared

## 23.5. ShoppingCart Detail Should Stay In The Same Workspace Flow

Decision:
- generate `ShoppingCart` from cart detail and open the result as another large overlay, not as a page redirect

Why:
- planning and purchase review are adjacent jobs in the same user session
- leaving the workspace context to inspect retailer output makes the flow feel broken apart
- the provider boundary should change later without forcing another UX rewrite

Implications:
- cart detail owns the `Generate shopping cart` CTA
- shopping-cart detail is read-only derived output for now
- real retailer integration should replace the matching provider behind the same overlay flow

## 23.6. ShoppingCart Should Be Editable In Place

Decision:
- keep `ShoppingCart` as a persisted resource that can be manually corrected in place

Why:
- automatic product matching will never be perfect
- forcing users to regenerate shopping carts just to fix one line creates unnecessary provider load and worse UX
- manual corrections should survive as part of the same purchase basket, not disappear into another temporary state

Implications:
- shopping-cart detail should support `Replace`, `Add item`, and `Delete`
- manual additions should not be forced to map back to a recipe ingredient
- backend should support retailer product search and `PATCH /api/v1/shopping-carts/:id`
- real Walmart integration should later slot behind the same searchable/editable boundary

## 23.7. Real Retailer Integration Should Land Behind The Existing Provider Boundary

Decision:
- implement a retailer-product provider boundary before turning on live retailer search/matching
- keep the mock provider as the default fallback until credentials are available

Why:
- the UI and `ShoppingCart` contract are already good enough to validate with a real provider
- swapping providers should not require another redesign of carts or shopping carts
- keeping the mock provider preserves local development and test stability

Implications:
- `MatchingService` should depend on a provider boundary instead of reading the mock catalog directly
- retailer OAuth/token handling and product search stay encapsulated in each provider
- `WALMART_USE_REAL_PROVIDER`, `WALMART_CLIENT_ID`, `WALMART_CLIENT_SECRET`, and `WALMART_ENV` control activation
- quantity and subtotal remain our responsibility even when the product catalog comes from Walmart

Status:
- implemented
- Kroger is now the first live provider path under the same boundary
- Walmart remains a compatible future provider, not the active one

## 24. Replace Boolean Ownership Semantics With Clearer States Later

Decision:
- `isSystemRecipe` is acceptable for the MVP, but it is not expressive enough for the long term

Likely future states:
- system catalog recipe
- user-authored recipe
- user-saved copy of system recipe
- possibly shared/public user recipe later

Why:
- a single boolean creates awkward edge cases
- the data model should eventually reflect origin and visibility more explicitly

Pragmatic path:
- keep the boolean short-term
- keep `forkedFromRecipeId` as the current bridge state
- revisit a richer enum-based model only when those states become real

## 24.5. Recipe Nutrition Should Be Optional Derived Metadata

Decision:
- add optional `nutrition_data` to recipes as a convenience snapshot
- keep ingredients as the source of truth

Why:
- the UI benefits from calories/macros without recomputing on every surface
- deterministic nutrition calculation can land later without changing recipe identity
- an optional snapshot is cleaner than forcing LLM-generated nutrition into the primary model

## 25. Development Identity Was Header-Based Before Real Auth

Decision:
- the project temporarily used `x-user-id` during the pre-auth phase
- that header should not survive once real JWT-based auth exists

Why:
- it let ownership and visibility rules ship before the auth stack was ready
- but it was always transitional infrastructure, not a valid long-term contract

Status:
- removed from normal backend flows and Swagger once the web app migrated to bearer tokens

## 26. Saved Recipe Forks Must Be Unique Per User And Source Recipe

Decision:
- a user may have at most one saved fork of a given source system recipe
- enforce this both in application logic and at the database level

Implemented rule:
- unique constraint on `(ownerUserId, forkedFromRecipeId)`
- the save/fork operation is idempotent for the same user and source recipe

Why:
- avoids duplicate user copies of the same source recipe
- makes the save action safe to repeat
- protects against races between concurrent requests

## 27. Cuisine Should Be A Controlled Taxonomy, Not A Free String

Decision:
- keep `cuisine` as a separate concept from `tags`
- do not reduce cuisine to gentilicios only
- do not keep cuisine as an unconstrained free-form string long-term

Interpretation:
- `cuisine` is a curated culinary taxonomy used for discovery and filtering
- valid cuisines may represent different levels such as:
  - national
  - regional
  - cultural
  - style

Examples:
- `Peruvian`
- `Middle Eastern`
- `East African`
- `Tex-Mex`
- `Mediterranean`

Why:
- cuisine and tags solve different UX problems
- cuisine is a primary classification axis
- tags are flexible secondary labels
- a free string leads to inconsistent values and bad filters

Recommended direction:
- move from `cuisine: string` to a controlled `Cuisine` catalog
- likely model:
  - `id`
  - `slug`
  - `label`
  - `kind: national | regional | cultural | style`
- recipes should eventually reference cuisine by relation rather than free text

Status:
- implemented as a global `Cuisine` catalog
- recipes now require `cuisine_id` on write and return expanded `cuisine` on read

## 28. Internal API Should Use A Clean `v1` Boundary

Decision:
- use a clean internal API boundary under `/api/v1` before real auth and tags work
- prefer resource-oriented route families over action-oriented endpoints

Approved route families:
- `/api/v1/recipes`
- `/api/v1/recipe-forks`
- `/api/v1/cart-drafts`
- `/api/v1/carts`
- `/api/v1/shopping-carts`

Why:
- the web app needs a coherent internal contract even if the API is not public
- auth and tags should land on top of stable resource boundaries, not on top of temporary route shapes
- versioning gives a controlled place for future breaking changes

Status:
- implemented

## 29. Cart And ShoppingCart Are Separate Domain Concepts

Decision:
- separate the recipe-based meal plan from the retailer-facing purchase basket

Interpretation:
- `Cart` answers "what do I want to cook?"
- `Cart` also keeps the retailer chosen during planning so that context survives the pipeline
- `Cart` may expose a derived ingredient overview for UX, but that overview is not the retailer-facing purchase state
- `ShoppingCart` answers "what do I need to buy?"

Why:
- one cart may produce one or more shopping-cart snapshots
- retailer matching belongs behind shopping-cart generation even if retailer context is persisted earlier on `Cart`
- this keeps meal-planning state separate from matching and pricing state

Approved flow:
- `Recipe -> CartDraft -> Cart -> ShoppingCart`

Status:
- implemented in API, shared types, and database schema

## 30. ShoppingCart Generation Should Not Wait For LLM Integration

Decision:
- the shopping-cart resource and API boundary should exist before any LLM rollout
- real retailer integration should plug into the shopping-cart stage behind a provider boundary

Why:
- retailer matching is a deterministic integration problem, not an LLM prerequisite
- delaying the boundary would keep the cart model ambiguous longer than necessary
- the same shopping-cart contract can work with mock matching now and Walmart later

Status:
- implemented at the resource-boundary level
- real retailer integration is still pending

## 31. Real Authentication Should Center On `/me` And Linked Identities

Decision:
- replace the current development header auth with a real account system
- use `/me` as the primary authenticated profile surface
- support multiple login methods that can resolve to the same user account

Primary authentication methods:
- Google OAuth
- email and password

Planned later or second-phase method:
- phone login

Why:
- users should not fragment into separate accounts based on auth provider
- `/me` is the cleanest profile-oriented API convention for the current product
- linked identities are more robust than overloading a single `User` row with provider-specific fields

Recommended model direction:
- `User`
- `AuthIdentity`
- optional `UserPreference`

Status:
- partially implemented
- email/password auth, Google backend login, refresh tokens, and `/me` are implemented
- `PATCH /me` is implemented
- `/me/preferences` is implemented using explicit cuisine and tag relations
- `/me/onboarding/complete` is implemented
- the first web client migration to bearer-token auth is implemented
- ownership now resolves primarily through JWT and `/me`

## 32. Preferences Are Higher-Value Than Demographics For Onboarding

Decision:
- do not prioritize demographic fields like `nationality` in the first real auth/profile rollout
- prioritize culinary preferences, dietary interests, and discovery signals instead

Examples:
- cuisines of interest
- dietary restrictions
- cooking interests
- budget sensitivity later

Why:
- these fields improve discovery and personalization directly
- they are more actionable than demographics for the product
- they create better onboarding UX than asking for profile data with weak product impact

Implication:
- onboarding should eventually connect to controlled taxonomies such as cuisines and tags
- we should avoid anchoring onboarding on raw `string[]` tags long-term

Status:
- backend preference persistence and `/me/preferences` are implemented
- onboarding completion is tracked separately from preferences
- onboarding UI is implemented as a required first-run flow with explicit skip support
- post-onboarding account/preferences editing is now exposed in the web app through `/account`

## 32.5. Onboarding Completion Must Be Separate From Preference Contents

Decision:
- do not infer onboarding completion from whether preference arrays are empty
- track onboarding completion explicitly on the user record

Why:
- empty preferences can mean "completed and skipped"
- using `[]` as both data and workflow state creates ambiguous semantics
- explicit completion state keeps `/me/preferences` focused on real preferences only

Implemented direction:
- `User.onboardingCompletedAt`
- `POST /api/v1/me/onboarding/complete`

## 32.6. Shopping Location Should Be Retailer-Neutral And GPS-Ready

Decision:
- persist a neutral `shopping_location` block inside `/me/preferences`
- do not bind the user's profile to one retailer before real provider integrations exist
- launch with manual ZIP/label entry first, but keep the shape ready for GPS later

Why:
- store/location matters across retailers, not just Kroger or Walmart
- asking for a preferred retailer too early adds coupling without solving the real problem
- GPS can improve UX later, but the model should not depend on geolocation from day one

Implications:
- `shopping_location` should include `zip_code`, `label`, and optional `latitude`/`longitude`
- onboarding and account/preferences can share the same write surface
- future provider integrations can resolve retailer-specific `locationId` values from this neutral profile block
- retailer-specific cache fields such as `kroger_location_id` may live alongside the neutral location shape as implementation details

## 32.7. Missing Shopping Location Should Fail Fast For Live Retailers

Decision:
- if a live retailer requires store context and the user has not configured a shopping location, fail explicitly instead of silently degrading to empty matches

Why:
- empty shopping carts look like broken matching, not missing prerequisites
- explicit failure tells the user exactly what to fix
- this avoids accidental provider traffic with invalid context

Implications:
- Kroger generation/search should surface messages like `Set your shopping location first`
- the UI should guide users toward account preferences or onboarding to fill the missing data

## 32.8. Store Resolution Should Be Reused, Not Repeated

Decision:
- once a retailer-specific store/location id is resolved successfully, the system should bias toward caching and reuse instead of re-hitting location lookup on every search

Why:
- repeated store-resolution traffic creates avoidable rate limiting and edge blocking risk
- product search is the useful expensive call; location resolution should be amortized
- the current live provider work already showed burst traffic can trigger `403 Access Denied` responses

Implications:
- provider implementations may keep internal location/query caches
- retailer-specific ids such as `kroger_location_id` can be persisted alongside neutral shopping-location data
- provider implementations should also avoid concurrent token storms and burst search chains where possible

## 32.9. Specialty Ingredients Should Prefer Honest No-Match Over Fake Substitutions

Decision:
- if the retailer catalog does not have a semantically reasonable match for a specialty ingredient, prefer `no match yet` over forced substitution

Examples:
- `aji amarillo paste`
- `aji limo`

Why:
- silent substitutions create incorrect purchase baskets
- users can manually replace or add products when they want a conscious substitute
- this keeps deterministic matching trustworthy instead of overconfident

Implications:
- matching should support ingredient query planning and specialty-ingredient detection
- rule-based scoring should be allowed to reject processed/prepared items even if they are textually close
- manual shopping-cart editing remains the escape hatch for rare or international ingredients

## 33. Phone Auth Should Not Be In The First Auth Slice

Decision:
- do not treat phone login as first-phase auth scope
- keep it as a later provider after Google OAuth and email/password are stable

Why:
- phone auth adds more operational and anti-abuse complexity
- Google + email/password is enough to unlock real ownership and profile flows
- sequencing matters more than provider count in the MVP

## 34. Account Security Should Focus On Sensitive Surfaces

Decision:
- use captcha and anti-abuse controls on sensitive auth flows, not everywhere

Priority surfaces:
- registration
- login if abuse appears
- forgot password / reset password

Why:
- broad captcha usage hurts UX
- the real value is protecting the abuse-prone entry points

## 35. Auth API Should Distinguish Identity, Profile, And Analytics

Decision:
- separate auth routes from profile routes and user analytics routes

Recommended route families:
- `/auth/*`
- `/me`
- `/me/stats`

Examples:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`
- `GET /me`
- `PATCH /me`
- `GET /me/stats`

Why:
- identity management, profile editing, and product stats are different concerns
- cleaner route boundaries make future policy and ownership rules easier to maintain

Status:
- auth and `/me` route families are now implemented
- `/me/stats` is now implemented as a lightweight counter surface

## 36. Backend Priorities Now Shift To Auth And Tags

Decision:
- after landing `/api/v1` and the `Cart`/`ShoppingCart` split, prioritize backend auth and taxonomy work before expanding frontend scope

Near-term order:
- real auth and `/me`
- ownership and authorization tightening
- hybrid tags
- controlled cuisine taxonomy
- retailer provider integration
- broader frontend product work after those backend foundations are stable

Why:
- auth and tags affect ownership, filtering, and profile boundaries
- those changes are cheaper now that the API surface is stable
- deeper frontend work would otherwise be built on temporary backend assumptions

## 37. Remove `x-user-id` After Client Migration

Decision:
- once the web app and tooling use bearer tokens, remove `x-user-id` from normal protected flows and Swagger guidance

Why:
- keeping two actor-resolution paths after the client migration only preserves avoidable debt
- tags, preferences, onboarding, and ownership should all rely on the same real auth boundary

Status:
- implemented

## 38. Current Frontend Is A Validation Harness, Not The Final UI

Decision:
- stop investing heavily in visual polish for the current Next.js frontend
- keep it functional enough to validate backend, provider, and AI flows

Why:
- the current frontend already proved the domain loop
- future UI can be rebuilt more effectively once the backend contracts are stable
- polishing a prototype UI now has lower leverage than strengthening product infrastructure

Implications:
- fix frontend bugs only when they block validation
- avoid large layout/design rewrites in the current UI
- prioritize clean API contracts and backend behavior for a future frontend rebuild
- future production UI may be rebuilt with tools such as Lovable, Stitch, v0, or a custom interface

## 39. MCPs And Open-Source Tools Are Adapters, Not Core Architecture

Decision:
- evaluate MCPs and open-source integrations for retailers, nutrition, cart export, pantry, and recipe generation
- wrap useful tools behind internal provider interfaces

Why:
- MCPs can accelerate integrations
- open-source tools vary in quality, licensing, uptime, and maintenance
- the product should not break if a tool is replaced

Implications:
- keep internal interfaces stable:
  - `RetailerProductProvider`
  - `NutritionProvider`
  - `RecipeGenerationProvider`
  - `RecipeEditingProvider`
  - `CartExportProvider`
  - `CookingAssistantToolProvider`
- do not let an MCP dictate database schema or public API shape
- MCPs should be swappable implementation details

## 40. AI Should Produce Structured Domain Data

Decision:
- use GPT/AI for recipe generation, recipe editing, and cooking assistance only through structured contracts

Why:
- free-text recipes are hard to aggregate, price, shop, and adapt
- structured output can flow into existing recipes, carts, nutrition, and matching
- deterministic logic should remain responsible for quantities, pricing, and provider selection

Implications:
- recipe generation should return recipe-compatible ingredient and step structures
- recipe editing should produce a fork/variant candidate, not mutate system recipes directly
- nutrition estimates should remain derived metadata
- AI should help with interpretation and adaptation, not replace aggregation or pricing

## 41. Cooking Assistant Should Be Contextual, Not Generic Chat

Decision:
- the future cooking assistant should be grounded in user preferences, current recipe, current step, active cart, and selected products

Why:
- generic cooking chat is easy to copy and weakly differentiated
- context-aware guidance is where Cussien can become meaningfully agentic
- the assistant should help during real cooking, not just answer recipe trivia

Implications:
- design a `CookingAssistantContext` before building chat UI
- include recipe state, shopping-cart state, dietary badges, preferences, substitutions, and step progress
- delay heavy assistant UI work until the underlying context contract is reliable

## 42. Cart Export Is A Product Capability Separate From Retail Matching

Decision:
- treat cart export/loading/sharing as a separate capability from product matching

Why:
- matching answers "which products should I buy?"
- export answers "how do I act on this cart?"
- some retailers may not expose direct checkout/cart APIs
- Share-A-Cart-style flows may be useful even when native provider APIs are limited

Implications:
- add a future `CartExportProvider` boundary
- support shareable or browser-assisted flows if direct cart APIs are not practical
- keep `ShoppingCart` as the persisted source of truth before any external transfer
