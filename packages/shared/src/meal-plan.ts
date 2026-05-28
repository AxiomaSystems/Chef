export type MealPlanMealLabel =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "prep"
  | "leftover"
  | "custom";

export type MealPlanSourceType =
  | "recipe"
  | "manual"
  | "leftover"
  | "eat_out"
  | "prep";

export type MealPlanEventStatus = "planned" | "cooked" | "eaten" | "skipped";

export type MealPlanRecipeSummary = {
  id: string;
  name: string;
  cover_image_url?: string | null;
  servings?: number;
  nutrition_data?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
};

export type MealEvent = {
  id: string;
  user_id?: string;
  date: string;
  meal_label: MealPlanMealLabel;
  custom_label?: string | null;
  source_type: MealPlanSourceType;
  status: MealPlanEventStatus;
  recipe_id?: string | null;
  recipe?: MealPlanRecipeSummary | null;
  title: string;
  notes?: string | null;
  servings?: number | null;
  locked?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MealPlanRangeDay = {
  date: string;
  events: MealEvent[];
};

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

export type MealPlanGrocerySummaryItem = {
  canonical_ingredient: string;
  display_ingredient?: string;
  amount: number;
  unit: string;
  event_ids?: string[];
};

export type MealPlanNutritionSummary = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type MealPlanRange = {
  from: string;
  to: string;
  days: MealPlanRangeDay[];
  events: MealEvent[];
  grocery_summary?: MealPlanGrocerySummaryItem[];
  nutrition_summary?: MealPlanNutritionSummary;
};

export type CreateMealEventRequest = {
  date: string;
  meal_label: MealPlanMealLabel;
  custom_label?: string | null;
  source_type: MealPlanSourceType;
  recipe_id?: string | null;
  title: string;
  servings?: number | null;
  notes?: string | null;
  status?: MealPlanEventStatus;
  locked?: boolean;
};

export type UpdateMealEventRequest = Partial<CreateMealEventRequest>;

export type GenerateMealPlanCartRequest = {
  from: string;
  to: string;
  event_ids: string[];
  retailer: string;
  mode: "replace_active" | "append_active";
};

export type GenerateMealPlanCartResponse = {
  id?: string;
  cart_id?: string;
  resource_id?: string;
};
