"use client";

import type { CalorieTrackingMode, GoalPriority } from "@cart/shared";
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
  onGoalPrioritiesChange: (v: GoalPriority[]) => void;
  onCalorieTrackingModeChange: (v: CalorieTrackingMode) => void;
};

export function StepGoalsNutrition({
  goalPriorities,
  calorieTrackingMode,
  onGoalPrioritiesChange,
  onCalorieTrackingModeChange,
}: Props) {
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
    </div>
  );
}
