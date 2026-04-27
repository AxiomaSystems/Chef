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
