import type { AggregatedIngredient } from "./aggregation";
import type { Cart, CartSelection } from "./cart";
import type { BaseRecipe, RecipeNutritionData } from "./recipe";
import type { Retailer } from "./product";

export type MealPlanMealType = "breakfast" | "lunch" | "dinner";

export type MealPlanDay = {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
};

export type MealPlan = {
  id?: string;
  user_id?: string;
  week_start: string;
  days: MealPlanDay[];
  created_at?: string;
  updated_at?: string;
};

export type UpdateMealPlanRequest = {
  days: MealPlanDay[];
};

export type MealEventLabel =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "prep"
  | "leftover"
  | "custom";

export type MealEventSourceType =
  | "recipe"
  | "manual"
  | "leftover"
  | "eat_out"
  | "prep";

export type MealEventStatus = "planned" | "cooked" | "eaten" | "skipped";

export type MealEvent = {
  id: string;
  user_id?: string;
  date: string;
  sort_order: number;
  meal_label: MealEventLabel;
  custom_label?: string | null;
  source_type: MealEventSourceType;
  recipe_id?: string | null;
  title: string;
  servings: number;
  status: MealEventStatus;
  locked: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MealEventWithRecipe = MealEvent & {
  recipe?: BaseRecipe | null;
};

export type MealPlanDayView = {
  date: string;
  events: MealEventWithRecipe[];
};

export type MealPlanNutritionSummary = Required<
  Pick<RecipeNutritionData, "calories" | "protein_g" | "carbs_g" | "fat_g">
>;

export type MealPlanGrocerySummary = {
  items: AggregatedIngredient[];
  item_count: number;
};

export type MealPlanRange = {
  from: string;
  to: string;
  days: MealPlanDayView[];
  events: MealEventWithRecipe[];
  grocery_summary: MealPlanGrocerySummary;
  nutrition_summary: MealPlanNutritionSummary;
};

export type CreateMealEventRequest = {
  date: string;
  meal_label?: MealEventLabel;
  custom_label?: string;
  source_type?: MealEventSourceType;
  recipe_id?: string;
  title?: string;
  servings?: number;
  sort_order?: number;
  status?: MealEventStatus;
  locked?: boolean;
  notes?: string;
};

export type UpdateMealEventRequest = Partial<CreateMealEventRequest>;

export type CreateMealPlanCartMode = "replace_active";

export type CreateMealPlanCartRequest = {
  from: string;
  to: string;
  event_ids?: string[];
  retailer: Retailer;
  mode?: CreateMealPlanCartMode;
};

export type CreateMealPlanCartResponse = {
  cart: Cart;
  selections: CartSelection[];
  event_count: number;
};
