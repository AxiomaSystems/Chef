import type { BaseRecipe, MealPlan } from "@cart/shared";
import { fetchAuthedCollection, fetchAuthedResource } from "@/lib/api";
import { MealPlanClient } from "./meal-plan-client";

function getMondayKey(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default async function MealPlanPage() {
  const recipesResult = await fetchAuthedCollection<BaseRecipe>("/recipes");
  const weekStart = getMondayKey(new Date());
  const mealPlanResult = await fetchAuthedResource<MealPlan>(
    `/meal-plans?week_start=${weekStart}`,
  );

  const initialMealPlan = mealPlanResult.ok && mealPlanResult.data
    ? mealPlanResult.data
    : {
        week_start: weekStart,
        days: Array.from({ length: 7 }, () => ({})),
      };

  return (
    <MealPlanClient
      recipes={recipesResult.data}
      initialMealPlan={initialMealPlan}
    />
  );
}
