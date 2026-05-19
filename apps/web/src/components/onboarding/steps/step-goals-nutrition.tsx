"use client";

import type {
  CalorieTrackingMode,
  GoalPriority,
  WeeklyNutritionTargets,
} from "@cart/shared";
import {
  CALORIE_TRACKING_MODE_VALUES,
  GOAL_PRIORITY_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  CALORIE_TRACKING_MODE_LABELS,
  GOAL_PRIORITY_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  goalPriorities: GoalPriority[];
  calorieTrackingMode: CalorieTrackingMode | null;
  weeklyNutritionTargets: WeeklyNutritionTargets;
  onGoalPrioritiesChange: (v: GoalPriority[]) => void;
  onCalorieTrackingModeChange: (v: CalorieTrackingMode) => void;
  onWeeklyNutritionTargetsChange: (v: WeeklyNutritionTargets) => void;
};

export function StepGoalsNutrition({
  goalPriorities,
  calorieTrackingMode,
  weeklyNutritionTargets,
  onGoalPrioritiesChange,
  onCalorieTrackingModeChange,
  onWeeklyNutritionTargetsChange,
}: Props) {
  function updateTarget(key: keyof WeeklyNutritionTargets, value: string) {
    const numberValue = Number(value);
    onWeeklyNutritionTargetsChange({
      ...weeklyNutritionTargets,
      [key]:
        value === "" || !Number.isFinite(numberValue) ? undefined : numberValue,
    });
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          What are you trying to achieve with Chef?
        </p>
        <p className="text-body-sm text-[#5f8689]">
          Pick everything that applies.
        </p>
        <ChipMultiSelect
          options={GOAL_PRIORITY_VALUES}
          selected={goalPriorities}
          onChange={onGoalPrioritiesChange}
          getLabel={(v) => GOAL_PRIORITY_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          How closely do you track nutrition?
        </p>
        <ChipSingleSelect
          options={CALORIE_TRACKING_MODE_VALUES}
          selected={calorieTrackingMode}
          onChange={onCalorieTrackingModeChange}
          getLabel={(v) => CALORIE_TRACKING_MODE_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-label-lg font-semibold text-[#315f62]">
            Weekly nutrition targets
          </p>
          <p className="mt-1 text-body-sm text-[#5f8689]">
            Add the weekly goals Chef should compare meal plans against.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["calories", "Calories", "kcal"],
            ["protein_g", "Protein", "g"],
            ["carbs_g", "Carbs", "g"],
            ["fat_g", "Fats", "g"],
          ].map(([key, label, unit]) => (
            <label key={key} className="grid gap-1.5">
              <span className="text-label-sm font-semibold text-[#315f62]">
                {label}
              </span>
              <div className="flex items-center rounded-xl border border-[#d9e8e6] bg-white px-3 py-2 focus-within:border-[#fe8e17] focus-within:ring-2 focus-within:ring-[#fe8e17]/20">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={
                    weeklyNutritionTargets[
                      key as keyof WeeklyNutritionTargets
                    ] ?? ""
                  }
                  onChange={(event) =>
                    updateTarget(
                      key as keyof WeeklyNutritionTargets,
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent text-body-sm text-[#143f42] outline-none"
                />
                <span className="text-label-sm text-[#5f8689]">{unit}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
