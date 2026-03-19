# Models - Cart Generator

This document describes the current shared domain contracts in [packages/shared](/C:/Users/akuma/repos/cart-generator/packages/shared).

The source of truth for these types is the code, not this markdown file:

- [index.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/index.ts)
- [recipe.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/recipe.ts)
- [selection.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/selection.ts)
- [aggregation.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/aggregation.ts)
- [product.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/product.ts)
- [cart.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/cart.ts)
- [user.ts](/C:/Users/akuma/repos/cart-generator/packages/shared/src/user.ts)

This file is a readable map of those contracts plus a note on whether they are implemented in runtime yet.

## Layer Split

- recipe models: what people cook and save
- selection models: what they want now
- aggregation models: what is needed
- product models: what can be bought
- cart models: final generated output
- user models: who owns what

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
  cuisine?: string;
  description?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
  created_at: string;
  updated_at: string;
};
```

Important current semantics:

- `is_system_recipe = true` means global immutable catalog content
- `owner_user_id` is set for user-owned recipes
- `forked_from_recipe_id` is set when a user saves a system recipe into their own editable library

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

Note:

- this shared contract expresses the conceptual draft shape
- the persisted API draft resource currently uses request-oriented `selections` in its DTO/response layer

## 3. Aggregation Models

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

### RecipeBundle

```ts
type RecipeBundle = {
  overview: RecipeBundleOverviewItem[];
  dishes: Dish[];
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

## 4. Product Models

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

## 5. Cart Models

### GenerateCartSelectionAdaptationRequest

```ts
type GenerateCartSelectionAdaptationRequest = {
  halal?: boolean;
  vegan?: boolean;
  calorie_range?: {
    min?: number;
    max?: number;
  };
  cheaper?: boolean;
  custom_notes?: string;
};
```

### GenerateCartRequestSelection

```ts
type GenerateCartRequestSelection = {
  recipe_id: string;
  recipe_type: "base" | "variant";
  quantity: number;
  servings_override?: number;
  adaptation_request?: GenerateCartSelectionAdaptationRequest;
};
```

### GenerateCartRequest

```ts
type GenerateCartRequest = {
  selections: GenerateCartRequestSelection[];
  retailer: Retailer;
};
```

### GenerateCartResponse

```ts
type GenerateCartResponse = {
  cart_draft_id?: string;
  dishes: Dish[];
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  retailer: Retailer;
};
```

### GeneratedCart

```ts
type GeneratedCart = {
  id?: string;
  dishes: Dish[];
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  estimated_total?: number;
  retailer: Retailer;
  created_at?: string;
};
```

Status:

- `POST /cart/generate` is implemented
- cart drafts and generated carts are persisted in the backend

## 6. User Models

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
- current API auth still uses development header context, not real login/session auth

## Current Model Constraints

- canonical ingredient naming is required
- aggregation and matching remain deterministic
- system recipes and user-owned recipes are distinct states
- a user can only have one saved fork per source system recipe
- tags are still plain `string[]` for now

## Known Future Changes

- `RecipeVariant` and adaptation models still need runtime implementation
- tags will likely move from `string[]` to a hybrid shared/private tag model
- auth will move from `x-user-id` development context to real authentication
- retailer types will expand beyond `"walmart"` once real integrations exist
