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

## 11. Redis for Async and Caching

Decision:
- use Redis later for caching and background jobs

Why:
- LLM calls and matching workflows can become expensive

## 12. Docker for Local Infra

Decision:
- run local infrastructure through Docker

Why:
- consistent onboarding
- reproducible local environments

## 13. Build the Pipeline Before the UI

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

## 16. System Recipes Are Global and Immutable

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
- `POST /recipes` should create recipes visible only to the owning user
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

## 18. Saving a System Recipe Should Create an Editable User Copy

Decision:
- do not allow direct editing of system recipes
- use an explicit save/fork flow that copies a system recipe into the user's editable library

Implemented shape:
- `POST /recipes/:id/save`
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
- `PATCH /recipes/:id` should continue accepting `steps`, but as full-array replacement for now

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

## 22. Development Identity Is Header-Based For Now

Decision:
- use a development-only actor resolution model based on `x-user-id`
- allow the header to resolve either a seeded user id or a seeded user email
- treat missing actor context as unauthenticated access

Current behavior:
- unauthenticated recipe reads expose only global system recipes
- mutable endpoints return `401 Authentication required`
- cart drafts and generated carts are always user-scoped and require an authenticated actor

Why:
- keeps backend development moving before real auth exists
- still lets ownership and visibility rules be enforced consistently

Trade-off:
- this is not production authentication
- the API surface must be revisited once real login/session auth is added

## 23. Saved Recipe Forks Must Be Unique Per User And Source Recipe

Decision:
- a user may have at most one saved fork of a given source system recipe
- enforce this both in application logic and at the database level

Implemented rule:
- unique constraint on `(ownerUserId, forkedFromRecipeId)`
- `POST /recipes/:id/save` is idempotent for the same user and source recipe

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

Pragmatic path:
- keep the current string short-term
- document the migration target now
- update `models` and `architecture` only when the schema and shared contracts actually change

## 25. Real Authentication Should Center On `/me` And Linked Identities

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

Suggested `AuthIdentity` responsibilities:
- provider type
- provider user id
- email when relevant
- phone when relevant
- password hash for password-based login
- verification timestamps
- last login metadata

## 26. Preferences Are Higher-Value Than Demographics For Onboarding

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

## 27. Phone Auth Should Not Be In The First Auth Slice

Decision:
- do not treat phone login as first-phase auth scope
- keep it as a later provider after Google OAuth and email/password are stable

Why:
- phone auth adds more operational and anti-abuse complexity
- Google + email/password is enough to unlock real ownership and profile flows
- sequencing matters more than provider count in the MVP

## 28. Account Security Should Focus On Sensitive Surfaces

Decision:
- use captcha and anti-abuse controls on sensitive auth flows, not everywhere

Priority surfaces:
- registration
- login if abuse appears
- forgot password / reset password

Why:
- broad captcha usage hurts UX
- the real value is protecting the abuse-prone entry points

## 29. Auth API Should Distinguish Identity, Profile, And Analytics

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
