# Models - Cart Generator

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
- selection models: what they want now
- cart models: the meal plan snapshot
- aggregation models: what is needed
- product models: what can be bought
- shopping-cart models: what will actually be purchased
- user models: who owns what
- auth models: how identities and sessions attach to users
- cuisine models: controlled culinary classification
- tag models: shared taxonomy plus private organization

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

## 3. Cart Models

### Cart

Current shape:

```ts
type Cart = {
  id: string;
  user_id: string;
  name?: string;
  selections: SelectedRecipe[];
  dishes: Dish[];
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- `Cart` is the stable meal-plan snapshot derived from recipes
- it answers "what am I planning to cook?"
- it should not own retailer-matching output directly

Current runtime note:

- this concept is now explicit in the API, shared models, and database schema
- `Cart` is the meal-plan snapshot, not the purchase basket

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
type Retailer = "walmart";
```

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
  canonical_ingredient: string;
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

Status:

- runtime matching is implemented against a mock catalog
- retailer support is still only `"walmart"`

## 6. Shopping Cart Models

### ShoppingCart

Current shape:

```ts
type ShoppingCart = {
  id: string;
  cart_id: string;
  retailer: Retailer;
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
- matching still runs against a mock provider and should later swap to a real retailer adapter

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
  created_at: string;
  updated_at: string;
};
```

Status:

- user records exist in persistence
- user records are now the ownership root for auth-backed resources

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
  created_at: string;
  updated_at: string;
};
```

Interpretation:

- system tags are shared taxonomy
- user tags are private to the owner unless sharing is introduced later
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
- auth can attach multiple identities to one user account
- cuisines are stored relationally as a global catalog
- tags are stored relationally as `Tag` + `RecipeTag`
- recipe HTTP payloads now use explicit tag references instead of `tags: string[]`

## Known Future Changes

- `RecipeVariant` and adaptation models still need runtime implementation
- the web app still needs to migrate from `x-user-id` fallback to bearer-token auth
- retailer types will expand beyond `"walmart"` once real integrations exist
- cuisine curation will likely expand, but the field is no longer free text
