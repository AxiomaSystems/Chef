# Models - Chef

This document describes the conceptual domain contracts in [packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared) and the current vocabulary of the implemented `/api/v1` API.

The source of truth for implemented types is still the code:

- [index.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/index.ts)
- [recipe.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/recipe.ts)
- [selection.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/selection.ts)
- [aggregation.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/aggregation.ts)
- [product.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/product.ts)
- [cart.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/cart.ts)
- [cuisine.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/cuisine.ts)
- [user.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/user.ts)

This file is a readable map of those contracts plus the now-implemented conceptual split between `Cart` and `ShoppingCart`.

## Layer Split

- recipe models: what people cook and save
- recipe import/generation models: how outside food ideas become structured recipes
- selection models: what they want now
- ingredient review models: what the user says they already have or want to remove before shopping
- cart models: the meal plan snapshot
- aggregation models: what is needed
- product models: what can be bought
- shopping-cart models: what will actually be purchased
- inventory models: what the user probably has, later
- nutrition and meal tracking models: calories/macros across recipes and meals, later
- user models: who owns what
- auth models: how identities and sessions attach to users
- cuisine models: controlled culinary classification
- tag models: shared taxonomy plus private organization, including explicit dietary badge tags
- provider/tool models: planned adapter contracts for retailers, nutrition, recipe AI, and cart export

## 1. Recipe Models

### RecipeStep

```ts
type RecipeStep = {
  step: number;
  what_to_do: string;
};
```

### DishIngredient

```ts
type DishIngredient = {
  canonical_ingredient: string;
  amount: number;
  unit: string;
  display_ingredient?: string;
  preparation?: string;
  optional?: boolean;
  group?: string;
};
```

Notes:

- `canonical_ingredient` is the normalized key used for aggregation and matching
- `display_ingredient` preserves the human-readable label when available

### Dish

```ts
type Dish = {
  id?: string;
  name: string;
  cuisine?: string;
  servings?: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
};
```

### RecipeNutritionData

```ts
type RecipeNutritionData = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};
```

### BaseRecipe

```ts
type BaseRecipe = {
  id: string;
  owner_user_id?: string;
  forked_from_recipe_id?: string;
  is_system_recipe: boolean;
  name: string;
  cuisine_id: string;
  cuisine: Cuisine;
  description?: string;
  cover_image_url?: string;
  nutrition_data?: RecipeNutritionData;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tag_ids: string[];
  tags: Tag[];
  created_at: string;
  updated_at: string;
};
```

Important current semantics:

- `is_system_recipe = true` means global immutable catalog content
- `owner_user_id` is set for user-owned recipes
- `forked_from_recipe_id` is set when a user saves a system recipe into an editable copy
- `nutrition_data` is optional derived recipe metadata, not the source of truth for ingredients
- dietary badges should come from expanded `tags` where `kind = dietary_badge`, not from recipe-local booleans

### Tag

```ts
type Tag = {
  id: string;
  owner_user_id?: string;
  name: string;
  slug: string;
  scope: "system" | "user";
  kind: "general" | "dietary_badge";
  created_at: string;
  updated_at: string;
};
```

Current semantics:

- `scope` answers who owns or shares the tag
- `kind` answers what the tag means in the taxonomy
- dietary badges like `vegan`, `halal`, and `gluten-free` stay in the same `Tag` table, but are explicitly marked as `dietary_badge`

### RecipeTransformationType

```ts
type RecipeTransformationType =
  | "halal"
  | "vegan"
  | "cheaper"
  | "calorie_adjusted"
  | "custom";
```

### RecipeVariant

```ts
type RecipeVariant = {
  id: string;
  base_recipe_id: string;
  name: string;
  transformation_type: RecipeTransformationType;
  transformation_prompt?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
  created_at: string;
};
```

Status:

- shared contract exists
- runtime implementation does not exist yet
- future implementation should use structured AI output instead of free-text recipe blobs

### RecipeAdaptationRequest

```ts
type RecipeAdaptationRequest = {
  base_recipe_id: string;
  target_constraints: {
    halal?: boolean;
    vegan?: boolean;
    vegetarian?: boolean;
    calorie_range?: {
      min?: number;
      max?: number;
    };
    max_cost?: number;
    custom_notes?: string;
  };
};
```

Status:

- shared contract exists
- runtime implementation does not exist yet

## 2. Selection Models

## 1.5. Planned Recipe Import And Generation Models

These models are not fully implemented yet. They describe the next startup-facing product direction.

### FoodIdea

```ts
type FoodIdea = {
  prompt: string;
  cuisine_id?: string;
  servings?: number;
  constraints?: {
    budget?: number;
    max_calories_per_serving?: number;
    macro_targets?: MacroTargets;
    dietary_tag_ids?: string[];
    available_ingredients?: string[];
    excluded_ingredients?: string[];
    max_time_minutes?: number;
  };
};
```

Interpretation:

- this is the entry point for "I want biryani" or "make me a cheap high-protein dinner"
- output should be a structured recipe preview, not just text

### ExternalRecipeSource

```ts
type ExternalRecipeSource = {
  kind: "url" | "text" | "image" | "menu" | "creator_post";
  source_url?: string;
  raw_text?: string;
  image_url?: string;
  attribution?: string;
};
```

Interpretation:

- this supports recipe forking/importing from outside Chef
- examples include recipe websites, restaurant menus, screenshots, creator posts, and pasted text

### StructuredRecipePreview

```ts
type StructuredRecipePreview = {
  name: string;
  cuisine_id?: string;
  description?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tag_ids?: string[];
  nutrition_data?: RecipeNutritionData;
  source?: ExternalRecipeSource;
};
```

Interpretation:

- generated/imported recipes should become previews first
- users can confirm, edit, fork, or discard before persistence

## 2. Selection Models

### AppliedRecipeConstraints

```ts
type AppliedRecipeConstraints = {
  halal?: boolean;
  vegan?: boolean;
  calorie_range?: {
    min?: number;
    max?: number;
  };
  cheaper?: boolean;
};
```

### SelectedRecipe

```ts
type SelectedRecipe = {
  recipe_id: string;
  recipe_type: "base" | "variant";
  quantity: number;
  servings_override?: number;
  applied_constraints?: AppliedRecipeConstraints;
};
```

### CartDraft

```ts
type CartDraft = {
  id: string;
  user_id?: string;
  name?: string;
  selected_recipes: SelectedRecipe[];
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `CartDraft` is editable user intent
- it is intentionally lighter-weight than a persisted `Cart`
- in the current product UX it should be treated as incomplete saved work, not the main planning object
- generating a `Cart` from a persisted draft should consume that draft by default

## 3. Cart Models

### Cart

Current shape:

```ts
type Cart = {
  id: string;
  user_id: string;
  name?: string;
  retailer: Retailer;
  selections: SelectedRecipe[];
  dishes: Dish[];
  overview: AggregatedIngredient[];
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `Cart` is the stable meal-plan snapshot derived from recipes
- it keeps the chosen retailer as planning context
- it exposes a derived aggregated ingredient overview for cart-detail reads
- it answers "what am I planning to cook?"
- it should not own retailer-matching output directly
- it is now the main planning object in the web UI once a run is generated

Current runtime note:

- this concept is now explicit in the API, shared models, and database schema
- `Cart` persists retailer because planning and purchase context should not disappear between draft and shopping-cart generation
- `Cart.overview` is derived from `dishes` on read, not stored as a second persisted source of truth
- `Cart` is the meal-plan snapshot, not the purchase basket

Current UI note:

- compact recipe cards should show dietary badges, not `nutrition_data`
- `nutrition_data` belongs primarily to recipe detail surfaces

## 4. Aggregation Models

## 3.5. Planned Ingredient Review Models

Ingredient review is the MVP-friendly bridge between "shopping cart from recipe" and full inventory.

Instead of requiring exact pantry tracking, the user should be able to review generated ingredients and remove or adjust things they already have.

### IngredientReviewItem

```ts
type IngredientReviewItem = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  display_ingredient?: string;
  source_dishes: AggregatedIngredientSource[];
  action: "buy" | "already_have" | "skip" | "adjust";
  adjusted_amount?: number;
  adjusted_unit?: string;
};
```

### IngredientReview

```ts
type IngredientReview = {
  cart_id?: string;
  items: IngredientReviewItem[];
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `IngredientReview` is not the same as inventory
- it is a per-cart decision surface before retailer matching
- it lets the MVP solve "I already have this" without requiring full pantry automation

## 4. Aggregation Models

### AggregatedIngredientSource

```ts
type AggregatedIngredientSource = {
  dish_name: string;
  amount: number;
  unit: string;
};
```

### AggregatedIngredient

```ts
type AggregatedIngredient = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  source_dishes: AggregatedIngredientSource[];
  purchase_unit_hint?: string;
  ingredient_id?: string;
  in_kitchen?: boolean;
};
```

### RecipeBundleOverviewItem

```ts
type RecipeBundleOverviewItem = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  purchase_unit_hint?: string;
  walmart_search_query?: string;
};
```

### CartComputationResult

```ts
type CartComputationResult = {
  dishes: Dish[];
  overview: AggregatedIngredient[];
};
```

Status:

- aggregation runtime is implemented

## 5. Product Models

### Retailer

```ts
type Retailer = "walmart" | "kroger" | "instacart";
```

### RetailerCapability

```ts
type RetailerCapability = {
  retailer: Retailer;
  label: string;
  supports_product_search: boolean;
  supports_location_lookup: boolean;
  supports_cart_handoff: boolean;
  supports_native_checkout: boolean;
  requires_location: boolean;
  requires_api_key: boolean;
  status: "configured" | "disabled" | "partner_required";
  demo_priority: number;
  notes?: string;
};
```

Current use:

- exposed by `GET /api/v1/retailers/capabilities`
- lets clients distinguish Kroger-style product search from Instacart-style hosted cart handoff
- keeps Walmart visible as partner-gated without pretending it is demo-ready

### ProductCandidate

```ts
type ProductCandidate = {
  product_id: string;
  title: string;
  brand?: string;
  price: number;
  size_value?: number;
  size_unit?: string;
  quantity_text?: string;
  estimated_match_score?: number;
  url?: string;
  image_url?: string;
};
```

### MacroTargets

```ts
type MacroTargets = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};
```

### RetailerSearchCandidate

```ts
type RetailerSearchCandidate = {
  retailer: Retailer;
  query: string;
  canonical_ingredient: string;
  candidates: ProductCandidate[];
};
```

### MatchedIngredientProduct

```ts
type MatchedIngredientProduct = {
  kind?: "ingredient_match" | "manual_item";
  canonical_ingredient: string;
  manual_label?: string;
  needed_amount: number;
  needed_unit: string;
  matched_amount?: number;
  matched_unit?: string;
  purchase_unit_hint?: string;
  walmart_search_query: string;
  selected_product: ProductCandidate | null;
  selected_quantity?: number;
  estimated_line_total?: number;
  fallback_used?: boolean;
  notes?: string;
};
```

Current note:

- `walmart_search_query` is still the shared field name for the generated catalog query, even though matching is no longer Walmart-only
- this is a legacy naming wrinkle in the shared contract, not a sign that the Kroger path is fake

Status:

- runtime matching is implemented behind a retailer-provider boundary
- the default fallback provider is still the mock catalog
- Kroger is now the first live provider path
- a Walmart provider boundary also exists for later activation
- Instacart is modeled as a retailer value, but the first implementation is cart handoff/export rather than line-by-line product matching
- manual shopping-cart lines use `kind = "manual_item"` and do not need to map back to a canonical ingredient source

Provider note:

- future retailer integrations, cart-export tools, and MCP-backed product search should map into these product models rather than changing the core cart model

## 6. Shopping Cart Models

### ShoppingCart

Current shape:

```ts
type ShoppingCart = {
  id: string;
  cart_id: string;
  retailer: Retailer;
  external_url?: string;
  external_reference_id?: string;
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  estimated_total?: number;
  created_at: string;
};
```

Interpretation:

- `ShoppingCart` is the retailer-facing purchase basket derived from a `Cart`
- it answers "what do I need to buy?"
- retailer matching, quantities, and subtotal belong here

Current runtime note:

- this concept is now represented explicitly as `ShoppingCart`
- matching now runs behind a provider boundary
- `ShoppingCart` can still be created and edited with the mock provider in local/dev
- the same contract now works with live Kroger search/matching and is still intended to work with Walmart later

Current UI note:

- `ShoppingCart` now has a first-class detail overlay in web, but it is still treated as derived output from `Cart`
- the overlay should emphasize matched purchasable products and subtotal, not recipe editing
- the same persisted `ShoppingCart` can now be manually corrected by replacing matches, adding manual items, deleting lines, and changing `selected_quantity`
- `overview` remains the ingredient-source snapshot, but the main UI emphasis should stay on `matched_items`

## 7. User Models

## 6.5. Inventory And Meal Tracking Models

Inventory now has a lightweight implemented slice. It is intentionally rough: it records what a user says they have, not exact pantry quantities.

### Ingredient

```ts
type Ingredient = {
  id: string;
  canonical_name: string;
  slug: string;
  aliases?: string[];
  category?: string;
  default_unit?: string;
  vision_labels?: string[];
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `Ingredient` is a shared global catalog
- it deduplicates ingredient names across users, recipes, future nutrition, future retailer search, and future computer vision
- `vision_labels` is reserved for future object-detection labels, not used in the current demo

### KitchenInventoryItem

```ts
type KitchenInventoryItem = {
  id: string;
  user_id: string;
  ingredient_id: string;
  ingredient: Ingredient;
  label?: string;
  estimated_amount?: number;
  unit?: string;
  confidence: "low" | "medium" | "high";
  source: "manual" | "cart" | "vision" | "receipt" | "inferred" | "seed";
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- kitchen inventory state starts rough, not exact
- current demo uses presence/absence only
- exact quantity tracking is a later capability
- "things I usually have" is valuable before object detection is reliable
- shopping-cart generation can skip ingredients marked in kitchen

### MealLog

```ts
type MealLog = {
  id: string;
  user_id: string;
  recipe_id?: string;
  cart_id?: string;
  name: string;
  servings_consumed?: number;
  nutrition_data?: RecipeNutritionData;
  eaten_at: string;
};
```

Interpretation:

- meal tracking connects recipes to calories/macros
- this is later than recipe generation and grocery execution
- it should reuse structured recipe and nutrition data rather than free-text logs

## 7. User Models

### UserRole

```ts
type UserRole = "admin" | "user";
```

### User

```ts
type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
};
```

Status:

- user records exist in persistence
- user records are now the ownership root for auth-backed resources

### UserPreferences

Current shape:

```ts
type UserPreferences = {
  preferred_cuisine_ids: string[];
  preferred_cuisines: Cuisine[];
  preferred_tag_ids: string[];
  preferred_tags: Tag[];
  shopping_location?: {
    zip_code?: string;
    label?: string;
    latitude?: number;
    longitude?: number;
    kroger_location_id?: string;
  };
};
```

Interpretation:

- preferences are auth-backed user state
- cuisines in preferences must exist in the global catalog
- tags in preferences are currently limited to shared system tags
- `PUT /api/v1/me/preferences` replaces the full set
- `shopping_location` is intentionally retailer-neutral and manual-first
- `latitude` and `longitude` are optional now so the same shape can absorb GPS later without another contract rewrite
- `kroger_location_id` is optional retailer-specific cache data, not a replacement for the neutral location fields
- empty arrays are valid and do not imply incomplete onboarding

## 8. Auth Models

### AuthProvider

```ts
type AuthProvider = "google" | "password";
```

### AuthIdentity

Conceptual implemented shape:

```ts
type AuthIdentity = {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_subject: string;
  email: string;
  email_verified: boolean;
  password_hash?: string;
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `AuthIdentity` links an external or local login method to one `User`
- one `User` may have multiple identities
- password auth and Google auth can converge on the same account

### RefreshToken

Conceptual implemented shape:

```ts
type RefreshToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at?: string;
  replaced_by_token_id?: string;
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- refresh tokens are persisted server-side as hashes, not cleartext
- refresh rotation revokes the previous token and links it to the replacement token

## 8.5. Planned Provider And Agent Models

These are not all implemented contracts yet. They describe the direction for future integrations.

### RetailerProductProvider

Current role:

- search products for a retailer
- resolve products by query and shopping location
- return normalized `ProductCandidate` records

Implemented examples:

- mock provider
- Kroger provider
- Walmart provider boundary

### NutritionProvider

Planned role:

- resolve calories/macros from structured ingredients
- prefer deterministic nutrition databases
- optionally use AI to normalize ambiguous ingredient text
- update recipe `nutrition_data` as a derived snapshot

### RecipeGenerationProvider

Planned role:

- generate structured `BaseRecipe`-compatible output from user preferences and prompts
- return ingredients, steps, cuisine, tags, and optional nutrition estimates in typed form

### RecipeEditingProvider

Planned role:

- transform an existing recipe under explicit constraints
- keep the original recipe intact
- emit structured recipe data suitable for a fork or variant

### CartExportProvider

Planned role:

- turn a persisted `ShoppingCart` into an actionable external cart/share/export format
- support Share-A-Cart-style or browser-extension-assisted transfer if direct retailer checkout APIs are unavailable

Current status:

- Instacart handoff is implemented as the first cart-export path
- `ShoppingCart.external_url` stores the hosted Instacart shopping-list URL when available
- `ShoppingCart.external_reference_id` stores Chef's reference id for the external handoff
- Kroger remains the stronger line-by-line matching path; Instacart is the smoother demo/user handoff path

### CookingAssistantContext

Planned role:

- provide contextual state to a cooking assistant
- include user preferences, current recipe, current step, active cart, selected products, and substitution context

Important rule:

- these providers should depend on stable Chef models
- Chef models should not directly depend on one MCP, retailer, or AI provider

## 9. Tag Models

### TagScope

```ts
type TagScope = "system" | "user";
```

### Tag

Current shape:

```ts
type Tag = {
  id: string;
  owner_user_id?: string;
  name: string;
  slug: string;
  scope: TagScope;
  kind: "general" | "dietary_badge";
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- system tags are shared taxonomy
- user tags are private to the owner unless sharing is introduced later
- dietary badges should currently be represented through curated system tags such as `halal`, `vegan`, `vegetarian`, `gluten-free`, `dairy-free`, and `high-protein`
- recipes now link to tags relationally, not through a persisted string array column
- recipe writes now reference tags by `tag_ids`
- recipe reads return expanded `tags` alongside `tag_ids`

## 10. Cuisine Models

### CuisineKind

```ts
type CuisineKind = "national" | "regional" | "cultural" | "style" | "other";
```

### Cuisine

Current shape:

```ts
type Cuisine = {
  id: string;
  slug: string;
  label: string;
  kind: CuisineKind;
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- cuisines are global and curated
- recipes reference cuisines by `cuisine_id`
- recipe reads return expanded `cuisine`
- `Other` is an intentional valid option to keep the field required without falling back to text input

## Current Model Constraints

- canonical ingredient naming is required
- aggregation and matching remain deterministic
- system recipes and user-owned recipes are distinct states
- a user can only have one saved fork per source system recipe
- one `Cart` is now the parent of persisted `ShoppingCart` snapshots
- one `Cart` now carries retailer context before shopping-cart generation
- auth can attach multiple identities to one user account
- cuisines are stored relationally as a global catalog
- tags are stored relationally as `Tag` + `RecipeTag`
- user preferences are stored relationally through join tables, not JSON blobs
- recipe HTTP payloads now use explicit tag references instead of `tags: string[]`
- specialty ingredients should prefer honest no-match over forced substitution when the active retailer catalog has no reasonable candidate

## Known Future Changes

- `RecipeVariant` and adaptation models still need runtime implementation
- AI recipe generation and editing need structured backend contracts
- nutrition providers need integration before `nutrition_data` can be reliably computed
- contextual cooking assistant models still need design and runtime implementation
- cart export/share models still need design
- the web app and backend now both use bearer-token auth as the normal path
- onboarding completion is now tracked separately from preference contents
- retailer support now includes `"kroger"` and will likely expand further
- cuisine curation will likely expand, but the field is no longer free text
