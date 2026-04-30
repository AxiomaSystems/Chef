# Chef Profile Memory v2

## Status

Draft for post-demo implementation.

This spec should not block the immediate demo branch. It defines the next profile/onboarding architecture for making Chef more agentic without turning onboarding into a flat form dump.

Owner:

- Piero owns backend, database, devops, and onboarding UI for this work.

Related docs:

- [architecture.md](/C:/Users/akuma/repos/cart-generator/docs/architecture.md)
- [models.md](/C:/Users/akuma/repos/cart-generator/docs/models.md)
- [decisions.md](/C:/Users/akuma/repos/cart-generator/docs/decisions.md)

## Problem

Chef wants to become a meal execution agent:

```text
food intent -> structured recipe -> ingredient review -> cart -> shopping cart -> cooking guidance
```

That requires user memory.

The current onboarding profile captures many useful answers, but most of the extended profile is stored as flat values on `User`:

- household size
- kids profile
- favorite proteins
- favorite flavors
- spice level
- disliked ingredients
- disliked textures
- cooking skill
- appliances
- preferred cooking time
- meal times
- goals
- budget
- stores
- shopping mode
- discovery sources
- cooking frustration

This is useful for MVP, but weak for an agent because it does not distinguish:

- hard constraint vs soft preference
- stable identity vs temporary goal
- explicit user rule vs inferred behavior
- dislike vs avoid
- low-confidence guess vs high-confidence fact
- equal-weight list vs prioritized tradeoff

Example:

```text
pork
```

could mean:

- religious restriction
- allergy or medical restriction
- health preference
- disliked ingredient
- temporary this-week avoidance
- low-confidence behavior inference

Chef should not treat those as equivalent.

## Product Principle

Onboarding should not be a long signup form.

It should feel like:

```text
Teach Chef your defaults.
```

or:

```text
Build your Chef memory.
```

The user is not filling database fields. The user is teaching Chef how to plan, shop, adapt, and cook for them.

## Goals

- Give the agent structured memory it can safely reason over.
- Preserve backward compatibility with existing `/me/preferences` flows.
- Keep cuisine and dietary tags relational.
- Make hard constraints impossible to confuse with soft preferences.
- Add pantry/staples as a rough inventory layer before exact pantry tracking.
- Support onboarding UI as a config-driven memory builder.
- Avoid a large, risky schema rewrite before the demo.

## Non-Goals

- Do not rebuild all account/profile UI at once.
- Do not delete current `User` preference columns in the first implementation.
- Do not auto-infer sensitive constraints without explicit confirmation.
- Do not expose Supabase direct table access to clients.
- Do not make vision detections mutate pantry state automatically.
- Do not implement full nutrition/macro tracking in this slice.

## Current Architecture To Preserve

Keep these decisions:

- `Cuisine` remains a curated global relation.
- `Tag` remains a hybrid taxonomy with `system` and `user` scope.
- Dietary badges remain `Tag.kind = dietary_badge`.
- `Ingredient` remains the global catalog for recipes, matching, inventory, and future vision mapping.
- `KitchenInventoryItem` remains rough presence/absence inventory, not exact pantry math.
- `/api/v1/me/preferences` remains the main profile/preferences API surface for now.
- `onboardingCompletedAt` remains separate from preference contents.

## Proposed Memory Layers

Profile Memory v2 should split user memory into four conceptual layers.

### 1. Stable Profile

Relatively stable defaults:

- household size
- cooking skill
- appliances
- typical cooking time
- typical meals
- shopping mode
- preferred stores
- shopping location

These can stay on `User` short-term because they are simple profile attributes.

Longer-term, they may move to a dedicated `UserProfile` table if the `User` row becomes too wide.

### 2. Food Rules

Structured rules for what Chef should prefer, avoid, or never suggest.

This is the highest-value schema improvement.

Recommended model:

```prisma
enum UserFoodRuleKind {
  dietary_constraint
  ingredient_preference
  texture_preference
}

enum UserFoodRuleAction {
  prefer
  dislike
  avoid
  require
}

enum UserRuleStrictness {
  soft
  hard
}

enum UserMemorySource {
  onboarding
  manual
  behavior
  inferred
  import
}

enum UserMemoryConfidence {
  low
  medium
  high
}

model UserFoodRule {
  id           String               @id @default(cuid())
  userId       String
  kind         UserFoodRuleKind
  label        String
  ingredientId String?
  tagId        String?
  action       UserFoodRuleAction
  strictness   UserRuleStrictness
  active       Boolean              @default(true)
  startsAt     DateTime?
  expiresAt    DateTime?
  source       UserMemorySource
  confidence   UserMemoryConfidence @default(high)
  notes        String?
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  ingredient   Ingredient?          @relation(fields: [ingredientId], references: [id], onDelete: SetNull)
  tag          Tag?                 @relation(fields: [tagId], references: [id], onDelete: SetNull)

  @@index([userId, kind])
  @@index([userId, strictness])
  @@index([userId, active, startsAt, expiresAt])
  @@index([ingredientId])
  @@index([tagId])
}
```

Interpretation:

- allergies, medical restrictions, and religious constraints are `hard`
- ordinary dislikes are `soft`
- `prefer` should rank recipes but not force inclusion
- `require` represents positive constraints such as halal, kosher, vegan, vegetarian, or gluten-free
- `avoid` means Chef should normally exclude or route around the item/rule
- `dislike` means Chef should down-rank or ask before using it
- `active`, `startsAt`, and `expiresAt` support temporary memory such as "avoid seafood this week"
- inferred behavior should start lower-confidence than explicit onboarding answers

Keep both `action` and `strictness`.

Examples:

- `require vegan` + `hard` means never suggest animal products.
- `prefer high_protein` + `soft` means rank high-protein options higher.
- `avoid seafood` + `soft` + `expiresAt` means avoid seafood temporarily.
- `avoid peanuts` + `hard` means a safety-critical restriction.

### 3. Goals And Tradeoffs

Agent goals need weight.

Current `goalPriorities: Json` is too flat because a list cannot express tradeoffs.

Recommended model:

```prisma
enum UserGoalKind {
  save_money
  save_time
  eat_healthier
  hit_protein
  reduce_waste
  try_new_foods
  cook_more_at_home
  meal_prep
  spend_less_on_takeout
}

enum UserGoalTimeframe {
  default
  this_week
  long_term
}

model UserGoal {
  id         String            @id @default(cuid())
  userId     String
  goal       UserGoalKind
  priority   Int
  active     Boolean           @default(true)
  startsAt   DateTime?
  expiresAt  DateTime?
  timeframe  UserGoalTimeframe @default(default)
  source     UserMemorySource  @default(onboarding)
  confidence UserMemoryConfidence @default(high)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, goal, timeframe])
  @@index([userId, active, priority])
  @@index([userId, active, startsAt, expiresAt])
}
```

Rules:

- `priority` should be constrained in service/DTO to `1..5`.
- Onboarding should probably ask users to pick up to 3 main goals.
- Later behavior may produce inferred goals with lower confidence.
- `active`, `startsAt`, and `expiresAt` allow temporary modes such as "budget mode this month".

### 4. Pantry Staples

Chef should know what users usually have at home.

This is not exact inventory. It is a stable rough pantry default.

Recommended model:

```prisma
model UserPantryStaple {
  userId       String
  ingredientId String
  source       UserMemorySource      @default(onboarding)
  confidence   UserMemoryConfidence  @default(high)
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
  user         User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  ingredient   Ingredient            @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@id([userId, ingredientId])
  @@index([ingredientId])
}
```

Interpretation:

- staples are "usually have", not "have exact amount right now"
- cart generation can bias these into `already_have` suggestions
- users should review them before shopping-cart generation
- staples should not silently skip expensive/specific items without review

## API Direction

Keep `/api/v1/me/preferences` as the compatibility endpoint.

Add one richer endpoint for v2 memory:

```text
GET /api/v1/me/profile-memory
PATCH /api/v1/me/profile-memory
```

Alternative:

```text
GET /api/v1/me/preferences-v2
PATCH /api/v1/me/preferences-v2
```

Recommendation:

Use `/profile-memory` because this is not only preferences.

### GET Response

```ts
type UserProfileMemory = {
  user: User;
  preferences: UserPreferences;
  food_rules: UserFoodRule[];
  goals: UserGoal[];
  pantry_staples: UserPantryStaple[];
  summary: ChefMemorySummary;
};
```

### ChefMemorySummary

The onboarding UI needs a compact summary for the "what Chef has learned" sidebar.

The summary should be derived on read, not stored as primary state.

```ts
type ChefMemorySummary = {
  household?: {
    label: string;
    detail?: string;
  };
  taste: {
    cuisine_count: number;
    favorite_proteins: string[];
    favorite_flavors: string[];
    spice_level?: string;
  };
  rules: {
    hard_rule_count: number;
    soft_rule_count: number;
    labels: string[];
  };
  kitchen: {
    skill_level?: string;
    appliance_count: number;
    preferred_time?: string;
  };
  pantry: {
    staple_count: number;
    labels: string[];
  };
  goals: Array<{
    goal: string;
    priority: number;
    timeframe: string;
  }>;
  shopping: {
    preferred_store_count: number;
    shopping_mode?: string;
    location_label?: string;
  };
  completion: {
    has_household: boolean;
    has_taste: boolean;
    has_rules: boolean;
    has_kitchen: boolean;
    has_pantry: boolean;
    has_goals: boolean;
    has_shopping: boolean;
    has_location: boolean;
  };
};
```

Use this for UI affordances such as:

```text
Chef knows:
- Planning for 2 people
- Likes Peruvian and Tex-Mex
- Avoids mushrooms
- Shops near ZIP 60201
```

### PATCH Request

```ts
type UpdateUserProfileMemoryRequest = {
  preferences?: Partial<UserPreferences>;
  food_rules?: UpsertUserFoodRuleInput[];
  goals?: UpsertUserGoalInput[];
  pantry_staple_ingredient_ids?: string[];
};
```

Write semantics:

- profile fields can be partial updates
- food rules should replace by category or use stable ids
- goals can replace the current active default goals
- pantry staple ids can replace the user's staple set
- because the endpoint supports partial updates, use `PATCH` instead of `PUT`

## Agent Context Direction

The AI/agent should not receive raw DB rows directly.

Introduce an internal mapper:

```ts
type ChefMemoryContext = {
  household: {
    size?: string;
    kids_profile?: string;
  };
  hard_constraints: Array<{
    label: string;
    ingredient_id?: string;
    tag_id?: string;
    source: string;
  }>;
  soft_preferences: Array<{
    label: string;
    action: "prefer" | "dislike" | "avoid";
    confidence: "low" | "medium" | "high";
  }>;
  goals: Array<{
    goal: string;
    priority: number;
    timeframe: string;
  }>;
  pantry_staples: Array<{
    ingredient_id: string;
    canonical_name: string;
  }>;
  shopping: {
    stores?: string[];
    mode?: string;
    budget?: string;
    location?: UserPreferences["shopping_location"];
  };
};
```

This context should be used by:

- recipe generation
- recipe import cleanup
- ingredient swaps
- future cooking assistant
- future meal-plan generation

## Service-Level Safety Rules

The service layer must enforce safety rules before writing profile memory.

Rules:

- inferred rules cannot be `hard`
- inferred rules cannot use `action = require`
- inferred dietary, allergy, medical, or religious constraints must require explicit user confirmation
- behavior inference can create low-confidence soft preferences only
- behavior inference can suggest `prefer`, `dislike`, or temporary soft `avoid`
- behavior inference must not create allergies, medical restrictions, religious restrictions, or other safety-critical constraints
- hard rules must come from `onboarding`, `manual`, or another explicit user-confirmed source
- hard rules should default to `confidence = high`
- expired rules should not be included in active agent context
- inactive rules should remain auditable but should not affect generation, matching, or cooking guidance

Examples:

- allowed inferred memory: "user often chooses chicken" -> `prefer chicken`, `soft`, `low`
- allowed inferred memory: "user skipped mushrooms 3 times" -> `dislike mushrooms`, `soft`, `medium`
- not allowed inferred memory: "user never chooses pork" -> `require halal`, `hard`
- not allowed inferred memory: "user removed peanuts once" -> `avoid peanuts`, `hard`

## Deduplication And Upsert Rules

Revisiting onboarding must not create duplicate rules.

Recommended natural key:

```text
user_id + kind + ingredient_id/tag_id/normalized_label + action
```

Rules:

- prefer `ingredientId` when the rule maps to a known ingredient
- prefer `tagId` when the rule maps to a known dietary tag
- use a normalized `label` only when no catalog entity exists yet
- normalized labels should be lowercase, trimmed, whitespace-collapsed, and punctuation-normalized
- if an incoming rule matches an existing rule, update the existing row instead of inserting
- updating should refresh `strictness`, `active`, `startsAt`, `expiresAt`, `source`, `confidence`, and `notes`
- explicit user edits should be allowed to upgrade an inferred low-confidence rule
- inferred writes should not downgrade explicit hard rules
- if a user removes a rule in onboarding, prefer `active = false` over hard delete unless the rule was created in the same draft/session

Potential Prisma constraint:

```prisma
@@unique([userId, kind, ingredientId, tagId, action])
```

Open concern:

- Postgres unique constraints with nullable columns allow duplicate `NULL` combinations. If this model needs strong database-level deduplication for label-only rules, use service-level upsert first or add generated normalized-key columns later.

## Legacy Source Of Truth

During migration, Profile Memory v2 and legacy `/me/preferences` must coexist without ambiguous writes.

Rules:

- `/api/v1/me/preferences` remains source of truth for current cuisine/tag preferences and shopping location until consumers migrate
- `/api/v1/me/profile-memory` becomes source of truth for v2 food rules, goals, and pantry staples
- legacy flat `User` fields remain readable during the transition
- profile-memory reads may map legacy fields into summary output when no v2 records exist
- profile-memory writes should write v2 tables and may also update compatible legacy fields for old clients
- new onboarding should write profile-memory first once the endpoint exists
- account settings can continue using `/me/preferences` until it is intentionally migrated
- do not delete legacy fields until frontend, AI, and account settings no longer read them

Migration behavior:

- existing `preferred_cuisine_ids` and `preferred_tag_ids` stay relational and are not duplicated into `UserFoodRule`
- existing `dislikedIngredients` can backfill soft `ingredient_preference` rules with `action = dislike`
- existing `dislikedTextures` can backfill soft `texture_preference` rules with `action = dislike`
- existing `goalPriorities` can backfill active default `UserGoal` rows with inferred priority order
- existing `availableAppliances`, `cookingSkillLevel`, `preferredCookingTime`, and shopping profile fields can remain stable profile attributes
- backfill should be idempotent

## Onboarding UX Direction

Framing:

```text
Build your Chef memory.
Teach Chef how to plan meals, groceries, and cooking help around you.
```

Avoid framing:

```text
Step 1 of 10
```

Use:

```text
Profile setup - about 2 min
Teaching Chef your defaults
Almost ready
```

### Proposed Steps

1. Household
2. Taste
3. Rules
4. Dislikes
5. Kitchen
6. Pantry
7. Goals
8. Shopping
9. Location
10. Chef Mode

If this needs to stay at 9 steps, merge `Taste` and `Dislikes`, or merge `Shopping` and `Location`.

### Step Definitions

Onboarding should be config-driven.

Suggested UI types:

```ts
type OnboardingStepDefinition = {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  required?: boolean;
  sections: OnboardingSection[];
};

type OnboardingSection = {
  id: string;
  title: string;
  subtitle?: string;
  field: keyof ProfileMemoryDraft;
  inputType:
    | "single-chip"
    | "multi-chip"
    | "searchable-chip"
    | "ranked-goals"
    | "location"
    | "text";
  options?: OnboardingOption[];
};

type OnboardingOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
};
```

Rules:

- UI labels must be separate from persisted values.
- Multi-select chips should use `aria-pressed`.
- Single-select chip groups should behave like radio groups.
- Long option sets should be searchable.
- `Skip` should become `Not sure yet` or `I'll set this later`.

### Step Details

#### Household

Purpose:

- servings defaults
- budget interpretation
- leftovers planning

Data:

- household size
- kids/special eaters profile

#### Taste

Purpose:

- recipe ranking
- meal generation defaults

Data:

- cuisines
- proteins
- flavors
- spice level

#### Rules

Purpose:

- hard safety and identity constraints

Data:

- allergies
- dietary restrictions
- religious restrictions
- medical restrictions

Persistence:

- `UserFoodRule.kind = dietary_constraint`
- `strictness = hard`
- `source = onboarding`
- `confidence = high`

#### Dislikes

Purpose:

- soft avoid behavior

Data:

- disliked ingredients
- disliked textures

Persistence:

- `UserFoodRule.kind = ingredient_preference | texture_preference`
- `action = dislike | avoid`
- `strictness = soft` unless user explicitly marks hard

#### Kitchen

Purpose:

- realistic recipe generation
- cooking guidance difficulty

Data:

- skill
- appliances
- time
- meal types

#### Pantry

Purpose:

- avoid obvious repeated grocery suggestions
- seed inventory/ingredient review defaults

Data:

- salt
- black pepper
- olive oil
- vegetable oil
- butter
- rice
- pasta
- flour
- sugar
- eggs
- milk
- garlic
- onion
- soy sauce
- hot sauce
- canned beans
- frozen vegetables

Persistence:

- `UserPantryStaple`
- optionally seed matching `KitchenInventoryItem` later after explicit confirmation

#### Goals

Purpose:

- agent tradeoff decisions

Data:

- save money
- save time
- eat healthier
- hit protein goals
- reduce waste
- cook more at home
- try new foods
- meal prep
- spend less on takeout

UX:

- ask user to pick up to 3
- optional ranking later

Persistence:

- `UserGoal`

#### Shopping

Purpose:

- retailer matching and handoff defaults

Data:

- budget
- stores
- in-store/pickup/delivery

Notes:

- budget should be interpreted relative to household size
- provider capabilities should eventually inform labels like "best supported" or "handoff"

#### Location

Purpose:

- live retailer product availability

Data:

- ZIP
- optional coordinates later
- retailer-specific location id cache

#### Chef Mode

Purpose:

- route product experience toward the user's primary need

Replace old "Discovery" market-research framing.

Options:

- Tell me what to cook
- Turn recipes into grocery carts
- Help me use what I already have
- Help me spend less
- Import recipes I save online
- Make meals healthier
- Guide me while cooking
- Help me meal prep
- Stop repeating the same meals

Persistence:

- could start as profile JSON
- later may become `UserGoal` or `UserAgentMode`

## Migration Strategy

Phase 1:

- add new tables
- keep current `User` fields
- add mappers from old fields into profile memory response
- do not delete old columns

Phase 2:

- update onboarding UI to write v2 profile memory
- keep account preferences compatible
- add profile memory summary to `/me`

Phase 3:

- update AI endpoints to consume `ChefMemoryContext`
- update cart/ingredient review to use pantry staples as suggestions

Phase 4:

- backfill old users into v2 tables
- mark old flat fields as legacy

Phase 5:

- only after stability, remove or stop writing legacy flat fields

## Backend Implementation Plan

1. Add Prisma enums and models:
   - `UserFoodRule`
   - `UserGoal`
   - `UserPantryStaple`
2. Add migration.
3. Generate Prisma client.
4. Add shared types in `packages/shared/src/user.ts`.
5. Add DTOs:
   - `update-profile-memory.dto.ts`
   - `profile-memory-response.dto.ts` or Swagger DTOs
6. Add service methods under `MeService` or a new `ProfileMemoryService`.
7. Add controller routes under `/api/v1/me/profile-memory`.
8. Add tests:
   - hard rule persistence
   - inferred memory safety rules
   - rule deduplication/upsert behavior
   - goal replacement/ranking
   - temporary goal/rule expiry behavior
   - pantry staple replacement
   - old preferences still work
9. Update Swagger.
10. Update docs.

## Frontend Implementation Plan

1. Create config-driven onboarding step registry.
2. Split UI into reusable components:
   - `OnboardingShell`
   - `OnboardingSidebar`
   - `OnboardingProgress`
   - `OnboardingStepCard`
   - `OnboardingActions`
   - `ChipGroup`
   - `SearchableChipGroup`
   - `SingleSelectChipGroup`
   - `MultiSelectChipGroup`
   - `PreferenceSummary`
   - `SaveStatusIndicator`
3. Change framing to Chef memory.
4. Add pantry step.
5. Convert discovery step into Chef Mode.
6. Separate hard rules from dislikes.
7. Add summary of what Chef has learned.
8. Keep `Finish` responsible for onboarding completion.

Autosave should be considered, but not necessarily in the first UI refactor.

Preferred first implementation:

- save on step continue
- `Finish` marks onboarding complete

Later improvement:

- debounced autosave with `Saving...` / `Saved`

## Compatibility Requirements

- Existing users should not be forced through onboarding again.
- Existing `/api/v1/me/preferences` consumers should keep working.
- Existing account preferences UI should keep working.
- The agent should tolerate missing v2 memory.
- Cart generation should not fail if pantry staples are empty.
- Old flat fields can remain readable during migration.

## Open Questions

- Should `UserFoodRule` support `expiresAt` for temporary rules?
- Should allergies be a separate model or just hard dietary constraints?
- Should pantry staples automatically create `KitchenInventoryItem` rows?
- Should `Chef Mode` become `UserGoal`, a separate enum, or profile JSON?
- Should goals support drag-to-rank in v1 or only "pick up to 3"?
- Should `UserFoodRule.label` support free text before ingredient matching?
- Should the first implementation use one `PATCH /profile-memory` endpoint or smaller category endpoints?

## Recommended First PR

Do not start with the UI.

First PR should be:

```text
Profile Memory v2 backend contracts
```

Scope:

- Prisma models
- shared types
- `/api/v1/me/profile-memory`
- compatibility mapper from old profile fields
- docs
- tests

Second PR:

```text
Onboarding as Chef memory builder
```

Scope:

- config-driven onboarding UI
- hard rules vs dislikes
- pantry step
- Chef Mode step
- improved progress/framing
- write to profile memory endpoint

This keeps the schema foundation reviewable before the UI starts relying on it.
