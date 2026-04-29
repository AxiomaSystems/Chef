# Onboarding Profile Preferences

This note documents the expanded onboarding preference flow added around the user profile. It is meant to help engineers understand where the onboarding questions live, how answers move through the web app, and how the API persists and returns them.

## Summary

The onboarding flow now collects more than cuisine, dietary tags, and shopping ZIP code. It captures household context, favorite proteins and flavors, disliked ingredients and textures, kitchen setup, goals, shopping preferences, recipe discovery sources, and cooking frustrations.

These answers are saved through the existing authenticated preferences endpoint:

```text
PUT /api/v1/me/preferences
GET /api/v1/me/preferences
```

Onboarding completion still remains separate:

```text
POST /api/v1/me/onboarding/complete
```

This separation matters because empty preferences are valid. Completion is tracked by `User.onboardingCompletedAt`, not by whether any particular preference field has values.

## Files Touched

- `apps/web/src/app/onboarding/onboarding-client.tsx`
  - Owns the multi-step onboarding UI.
  - Defines the static option sets.
  - Builds the `FormData` payload when the user finishes onboarding.

- `apps/web/src/app/onboarding/actions.ts`
  - Reads onboarding `FormData`.
  - Sends a JSON body to `PUT /me/preferences`.
  - Calls `POST /me/onboarding/complete` after preferences save successfully.

- `apps/api/src/user/dto/update-me-preferences.dto.ts`
  - Defines the accepted API payload for preference updates.
  - Validates arrays and strings for the new onboarding fields.

- `apps/api/src/user/me.service.ts`
  - Persists preference fields to the `User` row.
  - Maps saved profile fields back into the `UserPreferences` response.

- `packages/shared/src/user.ts`
  - Defines the client/shared `UserPreferences` response shape.

- `apps/api/src/common/http/swagger.dto.ts`
  - Documents the new response fields in Swagger.

- `apps/api/test/auth.e2e-spec.ts`
  - Adds coverage expectations for the new preference response contract.

## Current Onboarding Steps

The onboarding UI is organized into these steps:

1. `Who`
   - `household_size`
   - `kids_profile`

2. `Cuisines`
   - `preferred_cuisine_ids`

3. `Diet`
   - `preferred_tag_ids`

4. `Favorites`
   - `favorite_proteins`
   - `favorite_flavors`
   - `spice_level`

5. `Dislikes`
   - `disliked_ingredients`
   - `disliked_textures`

6. `Kitchen`
   - `cooking_skill_level`
   - `available_appliances`
   - `preferred_cooking_time`
   - `typical_meal_times`

7. `Goals`
   - `goal_priorities`
   - `calorie_tracking_mode`
   - `weekly_budget`

8. `Shopping`
   - `preferred_stores`
   - `shopping_mode`
   - `shopping_location`

9. `Discovery`
   - `recipe_discovery_sources`
   - `biggest_cooking_frustration`

## Persistence Model

The new fields are stored on the `User` model. Simple single-choice answers are stored as nullable strings. Multi-select answers are stored as nullable JSON arrays.

Examples:

```text
User.householdSize             String?
User.kidsProfile               String?
User.favoriteProteins          Json?
User.favoriteFlavors           Json?
User.dislikedIngredients       Json?
User.availableAppliances       Json?
User.goalPriorities            Json?
```

Dietary tag selection still uses the existing relational preference table:

```text
UserPreferredTag
```

For profile-level access, the selected dietary tag ids are also stored in `User.dietaryPreferences` as a JSON object:

```json
{
  "preferred_tag_ids": ["tag-system-vegetarian", "tag-system-gluten-free"]
}
```

This gives downstream profile consumers one nested `dietary_preferences` block while preserving the existing normalized tag relationship and expanded `preferred_tags` response.

## API Request Shape

`PUT /api/v1/me/preferences` accepts the legacy fields plus the new onboarding fields:

```json
{
  "preferred_cuisine_ids": ["cuisine-peruvian"],
  "preferred_tag_ids": ["tag-system-high-protein"],
  "shopping_location": {
    "zip_code": "60611",
    "label": "ZIP 60611",
    "kroger_location_id": ""
  },
  "household_size": "3-4 people",
  "kids_profile": "No kids",
  "favorite_proteins": ["Chicken", "Salmon"],
  "favorite_flavors": ["Spicy", "Savory / Umami"],
  "spice_level": "Medium heat",
  "disliked_ingredients": ["Olives"],
  "disliked_textures": ["Sticky"],
  "cooking_skill_level": "Intermediate - I improvise sometimes",
  "available_appliances": ["Oven", "Air fryer"],
  "preferred_cooking_time": "15-30 minutes",
  "typical_meal_times": ["Dinner", "Meal prep in batches"],
  "goal_priorities": ["Eat healthier overall"],
  "calorie_tracking_mode": "Casually - I just stay aware",
  "weekly_budget": "$50-$100",
  "preferred_stores": ["Kroger", "Aldi"],
  "shopping_mode": "I go in-store",
  "recipe_discovery_sources": ["YouTube", "Pinterest"],
  "biggest_cooking_frustration": "I never know what to make"
}
```

The endpoint still behaves as a replacement-style preferences write for cuisine and tag ids. Empty arrays are valid.

## API Response Shape

`GET /api/v1/me/preferences` and `PUT /api/v1/me/preferences` return the saved profile fields alongside the existing expanded cuisine and tag data:

```json
{
  "preferred_cuisine_ids": ["cuisine-peruvian"],
  "preferred_cuisines": [],
  "preferred_tag_ids": ["tag-system-high-protein"],
  "preferred_tags": [],
  "shopping_location": {
    "zip_code": "60611",
    "label": "ZIP 60611"
  },
  "household_size": "3-4 people",
  "kids_profile": "No kids",
  "dietary_preferences": {
    "preferred_tag_ids": ["tag-system-high-protein"]
  },
  "favorite_proteins": ["Chicken", "Salmon"],
  "favorite_flavors": ["Spicy", "Savory / Umami"],
  "spice_level": "Medium heat",
  "disliked_ingredients": ["Olives"],
  "disliked_textures": ["Sticky"],
  "cooking_skill_level": "Intermediate - I improvise sometimes",
  "available_appliances": ["Oven", "Air fryer"],
  "preferred_cooking_time": "15-30 minutes",
  "typical_meal_times": ["Dinner", "Meal prep in batches"],
  "goal_priorities": ["Eat healthier overall"],
  "calorie_tracking_mode": "Casually - I just stay aware",
  "weekly_budget": "$50-$100",
  "preferred_stores": ["Kroger", "Aldi"],
  "shopping_mode": "I go in-store",
  "recipe_discovery_sources": ["YouTube", "Pinterest"],
  "biggest_cooking_frustration": "I never know what to make"
}
```

## Naming Notes

Use `dietary_preferences` in API/shared TypeScript response shapes.

Use `dietaryPreferences` for the Prisma/User model property.

The originally requested spelling `dietryPreferenes` should not be used in code. It is treated as a typo, and the implemented spelling follows the existing project convention.

## Engineering Notes

- The web onboarding option sets are static constants in `onboarding-client.tsx`.
- The API currently validates these answers as strings and string arrays. It does not enforce enum membership, so option lists can evolve without immediate backend migrations.
- JSON array fields are normalized before persistence. Empty arrays are stored as JSON null for optional profile blocks.
- `dietaryPreferences` is intentionally a JSON object, not a raw array, so future dietary profile fields can be added under the same block.
- `preferred_tag_ids` remains the authoritative relational preference for dietary tags and expanded `preferred_tags`.
- `shopping_location` remains retailer-neutral, even though it can cache a `kroger_location_id`.

## Verification

After the change:

```text
pnpm --filter api build
pnpm --filter web exec eslint src/app/onboarding/onboarding-client.tsx
```

Both should pass.

Known local caveats from this workspace:

- `pnpm --filter web build` can fail if Next cannot fetch Google Fonts from the sandboxed network.
- Full `pnpm --filter web lint` currently reports unrelated existing issues outside onboarding.
