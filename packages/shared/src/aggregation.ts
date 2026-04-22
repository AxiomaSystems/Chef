import type { Dish } from "./recipe";

export type AggregatedIngredientSource = {
  dish_name: string;
  amount: number;
  unit: string;
};

export type AggregatedIngredient = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  source_dishes: AggregatedIngredientSource[];
  purchase_unit_hint?: string;
  ingredient_id?: string;
  in_kitchen?: boolean;
};

export type RecipeBundleOverviewItem = {
  canonical_ingredient: string;
  total_amount: number;
  unit: string;
  purchase_unit_hint?: string;
  walmart_search_query?: string;
};

export type RecipeBundle = {
  overview: RecipeBundleOverviewItem[];
  dishes: Dish[];
};

export type CartComputationResult = {
  dishes: Dish[];
  overview: AggregatedIngredient[];
};
