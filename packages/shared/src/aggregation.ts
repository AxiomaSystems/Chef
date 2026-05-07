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
  inventory_amount?: number;
  inventory_unit?: string;
  remaining_to_buy?: number;
  deduction_possible?: boolean;
  review_action?: "buy" | "already_have" | "skip" | "adjust";
  reviewed_amount?: number;
  reviewed_unit?: string;
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
