# Models - Cart Generator

This document defines the planned core data models for the system.

## Layer Split

- Recipe models: what people cook
- Selection models: what they want now
- Aggregation models: what is needed
- Product models: what can be bought
- Cart models: final output

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
- `canonical_ingredient` is the normalized key used for aggregation
- `display_ingredient` preserves the human-readable ingredient label

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
  user_id?: string;
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

### RecipeVariant

```ts
type RecipeVariant = {
  id: string;
  base_recipe_id: string;
  name: string;
  transformation_type: "halal" | "vegan" | "cheaper" | "calorie_adjusted" | "custom";
  transformation_prompt?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
  created_at: string;
};
```

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

## 2. Selection Models

### SelectedRecipe

```ts
type SelectedRecipe = {
  recipe_id: string;
  recipe_type: "base" | "variant";
  quantity: number;
  servings_override?: number;
  applied_constraints?: {
    halal?: boolean;
    vegan?: boolean;
    calorie_range?: {
      min?: number;
      max?: number;
    };
    cheaper?: boolean;
  };
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

## 3. Aggregation Models

### AggregatedIngredient

```ts
type AggregatedIngredient = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  source_dishes: {
    dish_name: string;
    amount: number;
    unit: string;
  }[];
  purchase_unit_hint?: string;
};
```

### RecipeBundle

```ts
type RecipeBundle = {
  overview: {
    canonical_ingredient: string;
    total_amount: number;
    unit: string;
    purchase_unit_hint?: string;
    walmart_search_query?: string;
  }[];
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

## 4. Product Models

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
  retailer: "walmart";
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
  purchase_unit_hint?: string;
  walmart_search_query: string;
  selected_product: ProductCandidate | null;
  fallback_used?: boolean;
  notes?: string;
};
```

## 5. Cart Models

### GeneratedCart

```ts
type GeneratedCart = {
  id?: string;
  dishes: Dish[];
  overview: AggregatedIngredient[];
  matched_items: MatchedIngredientProduct[];
  estimated_subtotal: number;
  estimated_total?: number;
  retailer: "walmart";
  created_at?: string;
};
```

### GenerateCartRequest

```ts
type GenerateCartRequest = {
  selections: {
    recipe_id: string;
    recipe_type: "base" | "variant";
    quantity: number;
    servings_override?: number;
    adaptation_request?: {
      halal?: boolean;
      vegan?: boolean;
      calorie_range?: {
        min?: number;
        max?: number;
      };
      cheaper?: boolean;
      custom_notes?: string;
    };
  }[];
  retailer: "walmart";
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
  retailer: "walmart";
};
```

## Design Constraints

- LLM outputs must be validated
- canonical ingredient naming is required
- units must be normalized before aggregation
- product matching must be deterministic
- models should remain composable
