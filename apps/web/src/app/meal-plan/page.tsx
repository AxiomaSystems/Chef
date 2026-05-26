import type {
  BaseRecipe,
  MealPlanRange,
  RecipeListPage,
  UserPreferences,
} from "@cart/shared";
import { fetchAuthedResource } from "@/lib/api";
import { MealPlanClient } from "./meal-plan-client";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildEmptyRange(from: string, to: string): MealPlanRange {
  const start = new Date(`${from}T00:00:00`);
  return {
    from,
    to,
    days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        date: toDateKey(date),
        events: [],
      };
    }),
    events: [],
    grocery_summary: [],
    nutrition_summary: {},
  };
}

function isMealPlanRange(value: MealPlanRange | null): value is MealPlanRange {
  return !!(
    value &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    Array.isArray(value.days) &&
    value.days.every(
      (day) => typeof day.date === "string" && Array.isArray(day.events),
    )
  );
}

export default async function MealPlanPage() {
  const recipesResult =
    await fetchAuthedResource<RecipeListPage>("/recipes?limit=100");
  const weekStart = getMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const from = toDateKey(weekStart);
  const to = toDateKey(weekEnd);
  const mealPlanResult = await fetchAuthedResource<MealPlanRange>(
    `/meal-plans?from=${from}&to=${to}`,
  );
  const preferencesResult =
    await fetchAuthedResource<UserPreferences>("/me/preferences");

  const initialMealPlan =
    mealPlanResult.ok && isMealPlanRange(mealPlanResult.data)
      ? mealPlanResult.data
      : buildEmptyRange(from, to);

  return (
    <MealPlanClient
      recipes={
        recipesResult.ok && recipesResult.data ? recipesResult.data.items : []
      }
      initialMealPlan={initialMealPlan}
      weeklyNutritionTargets={
        preferencesResult.ok && preferencesResult.data
          ? preferencesResult.data.weekly_nutrition_targets
          : undefined
      }
    />
  );
}
