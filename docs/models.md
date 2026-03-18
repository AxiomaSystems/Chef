# 🧩 Models — Cart Generator

## 🧠 Overview

This document defines the **core data models** of Cart Generator.

The system is intentionally divided into **separate model layers** to avoid mixing concerns:

* **Recipe models** → culinary domain (what people eat)
* **Selection models** → user intent (what they want now)
* **Aggregation models** → computation (what is needed)
* **Product models** → external mapping (what to buy)
* **Cart models** → final output (what gets purchased)

---

# 🍽️ 1. Recipe Models

## 1.1 RecipeStep

```ts
type RecipeStep = {
  step: number;
  what_to_do: string;
};
```

Represents a single instruction in a recipe.

---

## 1.2 DishIngredient

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

### Notes:

* `canonical_ingredient` → normalized key used for aggregation
* `display_ingredient` → original human-readable form
* `preparation` → e.g. chopped, boiled, minced
* `group` → optional grouping (sauce, topping, etc.)

---

## 1.3 Dish

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

Represents a fully structured recipe ready for computation.

---

## 1.4 BaseRecipe

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

### Role:

* Persistent, user-owned recipe
* Represents stable eating habits
* Never modified directly by AI

---

## 1.5 RecipeVariant

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

### Role:

* Derived version of a BaseRecipe
* Generated via LLM transformation
* Can be cached and reused

---

## 1.6 RecipeAdaptationRequest

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

### Role:

* Explicit description of what transformation was requested
* Separates **intent from result**

---

# 🧾 2. Selection Models

## 2.1 SelectedRecipe

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

### Role:

* Represents a recipe chosen for a specific cart
* Supports repetition (quantity)
* Supports per-selection constraints

---

## 2.2 CartDraft

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

### Role:

* Intermediate object before cart generation
* Captures user intent for a session (e.g. weekly plan)

---

# 🧮 3. Aggregation Models

## 3.1 AggregatedIngredient

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

### Responsibilities:

* Merge identical ingredients
* Sum quantities
* Track provenance (for debugging and UI)

---

## 3.2 RecipeBundle (LLM Output)

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

### Role:

* Structured output from LLM generation
* Used in early pipeline stages

---

## 3.3 CartComputationResult

```ts
type CartComputationResult = {
  dishes: Dish[];
  overview: AggregatedIngredient[];
};
```

### Role:

* Output of deterministic pipeline before product matching

---

# 🛍️ 4. Product Models

## 4.1 ProductCandidate

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

### Role:

* Represents a possible match from retailer search

---

## 4.2 RetailerSearchCandidate

```ts
type RetailerSearchCandidate = {
  retailer: "walmart";
  query: string;
  canonical_ingredient: string;
  candidates: ProductCandidate[];
};
```

---

## 4.3 MatchedIngredientProduct

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

### Role:

* Final selected product per ingredient

---

# 🛒 5. Cart Models

## 5.1 GeneratedCart

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

---

## 5.2 GenerateCartRequest

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

---

## 5.3 GenerateCartResponse

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

---

# 🧠 Model Boundaries

## Separation of Concerns

| Layer       | Models                                     |
| ----------- | ------------------------------------------ |
| Recipe      | BaseRecipe, RecipeVariant, Dish            |
| Selection   | CartDraft, SelectedRecipe                  |
| Aggregation | AggregatedIngredient                       |
| Product     | ProductCandidate, MatchedIngredientProduct |
| Cart        | GeneratedCart                              |

---

## Deterministic vs AI-driven

| Type          | Examples                       |
| ------------- | ------------------------------ |
| Deterministic | Aggregation, matching, pricing |
| AI-assisted   | RecipeVariant generation       |
| Hybrid        | Ingredient normalization       |

---

# ⚠️ Design Constraints

* **LLM outputs must be validated**
* **Canonical ingredient naming is required**
* **Units must be normalized before aggregation**
* **Product matching must be deterministic**
* **Models must remain composable**

---

# 🧭 Future Extensions

* Nutrition models (macros, calories)
* Multi-retailer support
* Inventory tracking
* Substitution graphs (ingredient → alternatives)
* Pricing optimization layer

---

# 🧠 Summary

These models define a system where:

* Recipes are **persistent and reusable**
* Variants are **transformations, not replacements**
* Aggregation is **deterministic**
* Product matching is **structured and auditable**
* Final output is a **real-world actionable cart**

---
