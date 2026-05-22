"use client";

import type {
  BaseRecipe,
  MealPlanRange,
  WeeklyNutritionTargets,
} from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { WeeklyMealPlan } from "@/components/meal-plan";

export function MealPlanClient({
  recipes,
  initialMealPlan,
  weeklyNutritionTargets,
}: {
  recipes: BaseRecipe[];
  initialMealPlan: MealPlanRange;
  weeklyNutritionTargets?: WeeklyNutritionTargets;
}) {
  return (
    <AppShell>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <WeeklyMealPlan
          recipes={recipes}
          initialMealPlan={initialMealPlan}
          weeklyNutritionTargets={weeklyNutritionTargets}
        />
      </div>
    </AppShell>
  );
}
