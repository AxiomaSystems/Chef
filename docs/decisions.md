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
- recipes now accept `tag_ids` on write and return expanded `tags` on read

## 21. Replace Boolean Ownership Semantics With Clearer States Later

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

## 22. Development Identity Was Header-Based Before Real Auth

Decision:
- the project temporarily used `x-user-id` during the pre-auth phase
- that header should not survive once real JWT-based auth exists

Why:
- it let ownership and visibility rules ship before the auth stack was ready
- but it was always transitional infrastructure, not a valid long-term contract

Status:
- removed from normal backend flows and Swagger once the web app migrated to bearer tokens

## 23. Saved Recipe Forks Must Be Unique Per User And Source Recipe

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

## 24. Cuisine Should Be A Controlled Taxonomy, Not A Free String

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

## 25. Internal API Should Use A Clean `v1` Boundary

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

## 26. Cart And ShoppingCart Are Separate Domain Concepts

Decision:
- separate the recipe-based meal plan from the retailer-facing purchase basket

Interpretation:
- `Cart` answers "what do I want to cook?"
- `ShoppingCart` answers "what do I need to buy?"

Why:
- one cart may produce one or more shopping-cart snapshots
- retailer integration belongs behind shopping-cart generation
- this keeps meal-planning state separate from matching and pricing state

Approved flow:
- `Recipe -> CartDraft -> Cart -> ShoppingCart`

Status:
- implemented in API, shared types, and database schema

## 27. ShoppingCart Generation Should Not Wait For LLM Integration

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

## 28. Real Authentication Should Center On `/me` And Linked Identities

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

## 29. Preferences Are Higher-Value Than Demographics For Onboarding

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

## 29.5. Onboarding Completion Must Be Separate From Preference Contents

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

## 30. Phone Auth Should Not Be In The First Auth Slice

Decision:
- do not treat phone login as first-phase auth scope
- keep it as a later provider after Google OAuth and email/password are stable

Why:
- phone auth adds more operational and anti-abuse complexity
- Google + email/password is enough to unlock real ownership and profile flows
- sequencing matters more than provider count in the MVP

## 31. Account Security Should Focus On Sensitive Surfaces

Decision:
- use captcha and anti-abuse controls on sensitive auth flows, not everywhere

Priority surfaces:
- registration
- login if abuse appears
- forgot password / reset password

Why:
- broad captcha usage hurts UX
- the real value is protecting the abuse-prone entry points

## 32. Auth API Should Distinguish Identity, Profile, And Analytics

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

## 33. Backend Priorities Now Shift To Auth And Tags

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

## 34. Remove `x-user-id` After Client Migration

Decision:
- once the web app and tooling use bearer tokens, remove `x-user-id` from normal protected flows and Swagger guidance

Why:
- keeping two actor-resolution paths after the client migration only preserves avoidable debt
- tags, preferences, onboarding, and ownership should all rely on the same real auth boundary

Status:
- implemented
