"use client";

import type { BaseRecipe, MealPlan } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { WeeklyMealPlan } from "@/components/meal-plan";

export function MealPlanClient({
  recipes,
  initialMealPlan,
}: {
  recipes: BaseRecipe[];
  initialMealPlan: MealPlan;
}) {
  return (
    <AppShell>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <WeeklyMealPlan recipes={recipes} initialMealPlan={initialMealPlan} />
      </div>
    </AppShell>
  );
}
