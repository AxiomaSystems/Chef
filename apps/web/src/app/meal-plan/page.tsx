import type {
  MealPlanRange,
  RecipeListPage,
  UserPreferences,
} from "@cart/shared";
import { fetchAuthedResource } from "@/lib/api";
import { MealPlanClient } from "./meal-plan-client";

function getMondayKey(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function buildEmptyRange(from: string, to: string): MealPlanRange {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const dayCount =
    Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

  return {
    from,
    to,
    days: Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(fromDate);
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), events: [] };
    }),
    events: [],
    grocery_summary: { items: [], item_count: 0 },
    nutrition_summary: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    },
  };
}

export default async function MealPlanPage() {
  const weekStart = getMondayKey(new Date());
  const weekEnd = new Date(`${weekStart}T00:00:00.000Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndKey = weekEnd.toISOString().slice(0, 10);
  const [recipesResult, mealPlanResult, preferencesResult] = await Promise.all([
    fetchAuthedResource<RecipeListPage>("/recipes?limit=100"),
    fetchAuthedResource<MealPlanRange>(
      `/meal-plans?from=${weekStart}&to=${weekEndKey}`,
    ),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
  ]);

  const initialMealPlan =
    mealPlanResult.ok && mealPlanResult.data
      ? mealPlanResult.data
      : buildEmptyRange(weekStart, weekEndKey);

  return (
    <MealPlanClient
      recipes={recipesResult.data?.items ?? []}
      initialMealPlan={initialMealPlan}
      weeklyNutritionTargets={
        preferencesResult.ok && preferencesResult.data
          ? preferencesResult.data.weekly_nutrition_targets
          : undefined
      }
    />
  );
}
