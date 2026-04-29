# Onboarding Profile Design

Date: `2026-04-29`
Scope: `apps/api`, `packages/shared`, `apps/web`
Status: `draft for review`

## Goal

Design a robust user onboarding and profile-preferences slice that gives Chef high-signal user context for recommendations, meal planning, shopping support, and future agent behavior.

This slice should:

- capture materially useful user preference data
- store it in a stable backend contract
- keep the data mostly structured rather than free-form
- preserve compatibility with the current auth and user model
- define the expected onboarding UI shape without requiring the UI implementation in this pass

## Product Intent

Chef should know enough about a user to make recommendations that feel personalized and operationally useful, not generic.

The onboarding data should help answer questions like:

- who is this person cooking for?
- what do they like and avoid?
- what can they realistically cook with their kitchen and time?
- what are they trying to optimize for?
- how do they shop and discover recipes?

This information is primarily for recommendation quality and future agent context, not just profile completeness.

## Recommended Approach

Use a mostly structured profile model with controlled options and a very small number of optional free-text fields.

### Why this approach

- it gives the agent cleaner signals than large free-text blobs
- it is easier to validate and migrate
- it keeps analytics and future prompt-building consistent
- it reduces the chance of noisy or contradictory user data

### Rejected alternatives

#### Fully free-form onboarding

This would be faster to wire, but the resulting data quality would be weak. It would also make downstream recommendation logic and prompt composition harder to trust.

#### Hard-normalizing every preference into separate relational tables

This would be cleaner for long-term taxonomy-heavy systems, but it is too heavy for the current product stage. Most of these fields behave better as structured profile metadata than as first-class relational entities.

## Scope

This spec includes:

- backend data model changes for user profile preferences
- API request and response shape
- shared TypeScript contract updates
- onboarding completion behavior
- validation rules
- testing expectations
- expected onboarding UI structure and field groups

This spec does not include:

- final visual design polish
- large UI component decomposition
- recipe recommendation algorithm changes
- prompt engineering details for the agent
- migration of historical users into inferred preferences

## Design Principles

### 1. Structured first

Most onboarding values should come from controlled lists owned by the product.

### 2. Minimal free-text

Allow very little free-form input. Free text should be reserved for nuance, not for the core profile model.

### 3. Backward compatible

Existing users and current `/me/preferences` behavior must continue to work when these new fields are absent.

### 4. One durable profile model

Onboarding and later account preference editing should write to the same underlying profile-preferences contract.

### 5. Stable source of truth

The backend data model should be the source of truth. The onboarding UI should be a data-entry flow over that contract, not a separate model.

## Profile Model

The robust onboarding profile should extend the existing user preferences model with the following fields.

### Household and context

- `household_size?: string`
- `kids_profile?: string`

### Dietary and taste profile

- `preferred_tag_ids?: string[]`
- `favorite_proteins?: string[]`
- `favorite_flavors?: string[]`
- `spice_level?: string`
- `disliked_ingredients?: string[]`
- `disliked_textures?: string[]`

### Kitchen reality

- `cooking_skill_level?: string`
- `available_appliances?: string[]`
- `preferred_cooking_time?: string`
- `typical_meal_times?: string[]`

### Goals and optimization

- `goal_priorities?: string[]`
- `calorie_tracking_mode?: string`

### Shopping behavior

- `weekly_budget?: string`
- `preferred_stores?: string[]`
- `shopping_mode?: string`
- `shopping_location?: string`

### Discovery and friction

- `recipe_discovery_sources?: string[]`
- `biggest_cooking_frustration?: string`

### Optional free-text extension

This slice may include one optional field for nuance:

- `profile_notes?: string`

If this field is added, it should be capped to a short length and treated as secondary context, not as structured truth.

## Fields Explicitly Out Of Scope For This Slice

The following should not be added yet unless the team decides to complete them fully end to end:

- `allergies`
- `dailyCaloriesTarget`
- `dailyProteinTargetGrams`
- `dailyCarbsTargetGrams`
- `dailyFatTargetGrams`

Reason:

- these fields increase product and validation complexity
- they imply stronger nutrition logic than the current app reliably supports
- partial implementation would create dead schema and misleading product surface

## Data Modeling Strategy

### Controlled strings and arrays

Most fields should be stored as strings or arrays of strings representing product-owned options.

Examples:

- `spice_level = "medium"`
- `favorite_proteins = ["chicken", "salmon"]`
- `goal_priorities = ["save_money", "eat_healthier"]`

The API may expose readable labels, but storage should prefer stable option values over presentation text where practical.

### Tags remain normalized

Dietary constraints should continue to use the existing normalized tag relationship as the source of truth.

If the API wants to expose a convenience shape such as:

```json
{
  "dietary_preferences": {
    "preferred_tag_ids": ["tag-system-high-protein"]
  }
}
```

that shape should be derived from the normalized tag relation rather than treated as an independent persistent truth.

### JSON vs scalar columns

Recommended persistence approach:

- scalar nullable string columns for single-value controlled fields
- JSON array columns for repeated controlled selections

This matches the current project's pragmatic use of Prisma while avoiding unnecessary join-table explosion.

## Backend Contract

### Write path

Primary write endpoint:

- `PUT /api/v1/me/preferences`

Onboarding completion endpoint:

- `POST /api/v1/me/onboarding/complete`

The onboarding flow should:

1. submit structured preferences through `PUT /api/v1/me/preferences`
2. mark onboarding completion separately through `POST /api/v1/me/onboarding/complete`

This keeps completion state independent from partial preference saves.

### Read path

Primary read endpoint:

- `GET /api/v1/me/preferences`

This response should return:

- legacy preference fields
- expanded structured onboarding fields
- current dietary tags in a stable normalized way

### Request shape

Recommended request shape:

```json
{
  "preferred_cuisine_ids": ["cuisine-peruvian"],
  "preferred_tag_ids": ["tag-system-high-protein"],
  "shopping_location": "Chicago, IL",
  "household_size": "3_4_people",
  "kids_profile": "no_kids",
  "favorite_proteins": ["chicken", "salmon"],
  "favorite_flavors": ["spicy", "umami"],
  "spice_level": "medium",
  "disliked_ingredients": ["olives"],
  "disliked_textures": ["chewy"],
  "cooking_skill_level": "intermediate",
  "available_appliances": ["oven", "air_fryer", "blender"],
  "preferred_cooking_time": "15_30_min",
  "typical_meal_times": ["lunch", "dinner"],
  "goal_priorities": ["save_money", "eat_healthier"],
  "calorie_tracking_mode": "casual",
  "weekly_budget": "50_100",
  "preferred_stores": ["kroger", "walmart"],
  "shopping_mode": "in_store",
  "recipe_discovery_sources": ["youtube", "social_media"],
  "biggest_cooking_frustration": "dont_know_what_to_make"
}
```

### Response shape

Recommended response shape:

```json
{
  "preferred_cuisine_ids": ["cuisine-peruvian"],
  "preferred_tag_ids": ["tag-system-high-protein"],
  "preferred_tags": [
    {
      "id": "tag-system-high-protein",
      "name": "High Protein"
    }
  ],
  "shopping_location": "Chicago, IL",
  "household_size": "3_4_people",
  "kids_profile": "no_kids",
  "favorite_proteins": ["chicken", "salmon"],
  "favorite_flavors": ["spicy", "umami"],
  "spice_level": "medium",
  "disliked_ingredients": ["olives"],
  "disliked_textures": ["chewy"],
  "cooking_skill_level": "intermediate",
  "available_appliances": ["oven", "air_fryer", "blender"],
  "preferred_cooking_time": "15_30_min",
  "typical_meal_times": ["lunch", "dinner"],
  "goal_priorities": ["save_money", "eat_healthier"],
  "calorie_tracking_mode": "casual",
  "weekly_budget": "50_100",
  "preferred_stores": ["kroger", "walmart"],
  "shopping_mode": "in_store",
  "recipe_discovery_sources": ["youtube", "social_media"],
  "biggest_cooking_frustration": "dont_know_what_to_make"
}
```

## Validation Rules

Validation should be stricter than Ahmad's current implementation.

### General rules

- no uncontrolled arbitrary strings for structured fields
- arrays must contain only allowed option values
- repeated arrays should be deduplicated
- empty arrays should round-trip as `[]` at the API layer, not ambiguous `null`
- all fields remain optional for backward compatibility

### Free-text rules

For `profile_notes` or any future human-text field:

- trim whitespace
- enforce a short max length
- reject oversized payloads

### Unknown option handling

Unknown controlled values should fail validation with `400`, not silently persist.

## Prisma and Persistence Guidance

Recommended persistence additions on `User`:

- nullable scalar fields for single-value selections
- nullable JSON arrays for repeated selections
- keep `onboardingCompletedAt` as the completion marker

Important constraint:

- do not add new schema fields without a matching migration
- do not add schema fields that are not wired through DTO, service, shared contract, and tests

## Shared Contract Guidance

[packages/shared/src/user.ts](C:\Users\akuma\repos\cart-generator\packages\shared\src\user.ts) should define the expanded preferences model used by both the API and web app.

The shared contract should prefer stable enum-like string values over UI labels.

This contract should become the single TypeScript map for:

- onboarding submission shape
- `/me/preferences` response shape
- account preferences editing shape later

## Expected UI Shape

This slice does not implement the final onboarding UI, but it does define its expected structure.

### UI model

The onboarding should be a multi-step wizard grouped by user intent, not a long unstructured form.

Recommended step structure:

1. `Household`
2. `Cuisine and dietary profile`
3. `Taste and dislikes`
4. `Kitchen reality`
5. `Goals and nutrition posture`
6. `Shopping behavior`
7. `Discovery and friction`
8. `Location confirmation`

### Step details

#### 1. Household

- household size
- kids profile

#### 2. Cuisine and dietary profile

- preferred cuisines
- dietary tags

#### 3. Taste and dislikes

- favorite proteins
- favorite flavors
- spice level
- disliked ingredients
- disliked textures

#### 4. Kitchen reality

- cooking skill level
- available appliances
- preferred cooking time
- typical meal times

#### 5. Goals and nutrition posture

- goal priorities
- calorie tracking mode

#### 6. Shopping behavior

- weekly budget
- preferred stores
- shopping mode

#### 7. Discovery and friction

- recipe discovery sources
- biggest cooking frustration
- optional short notes if included

#### 8. Location confirmation

- shopping location

### UI interaction guidance

- use multi-select chips or cards for repeated controlled options
- use single-select segmented or chip controls for single-value controlled options
- use short helper copy that explains why each question matters
- allow skipping non-critical questions
- support partial save and resume

### UI state expectations

The UI should support:

- fresh onboarding
- partially completed onboarding
- already completed users editing the same data later in account preferences

The form state should map directly to the backend contract with minimal translation.

## Error Handling

### Backend

- invalid controlled values return `400`
- malformed arrays return `400`
- unauthorized requests return `401`
- write failures return `500` with existing project error conventions

### Onboarding flow

- preference save failure should not mark onboarding complete
- onboarding completion should only happen after a successful preference save
- partial profile data should remain valid even when onboarding is incomplete

## Testing Expectations

Minimum backend validation:

- save preferences with only legacy fields
- save preferences with the full new structured profile
- read preferences for users with missing new fields
- reject unknown option values
- preserve normalized dietary tag behavior
- onboarding completion remains independent of preferences content

Minimum shared/web validation:

- form payload shape matches shared contract
- arrays serialize and deserialize predictably
- empty selections do not produce ambiguous persistence behavior

## Rollout Strategy

Recommended delivery order:

1. define allowed option vocabularies
2. update shared contract
3. add Prisma schema and migration
4. update DTO and service logic
5. add backend tests
6. wire onboarding actions
7. build or refactor onboarding UI in a separate pass

This order keeps product shape stable before UI polish work starts.

## Migration Notes

Existing users should continue to work with all new fields unset.

There is no requirement to backfill historical users.

If account preferences editing later exposes these fields, it should reuse the same contract and validation lists rather than invent a second profile model.

## Integration Guidance For `ahmad_v3`

Use `origin/ahmad_v3` as reference material, not as a direct merge target for onboarding.

Safe pieces to reuse conceptually:

- question categories
- product intent
- some DTO and service wiring patterns
- the onboarding documentation effort

Unsafe pieces to trust without cleanup:

- schema additions without migration
- broad free-form strings for structured fields
- monolithic onboarding UI implementation
- mixed branch changes unrelated to onboarding

## Success Criteria

This slice is successful when:

- Chef can persist a materially richer user profile
- the backend contract is stable and validated
- onboarding data is structured enough for future agent use
- the UI has a clear implementation target
- the team can build UI later without re-deciding the profile model

## Open Questions

- Should `shopping_location` remain free text or move toward structured location metadata later?
- Do we want one optional free-text `profile_notes` field in v1, or none at all?
- Which controlled vocabularies should be centralized as shared constants versus backend-owned validation tables?
