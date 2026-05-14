"use client";

import type {
  AvailableAppliance,
  CookingSkillLevel,
  PreferredCookingTime,
  TypicalMealTime,
} from "@cart/shared";
import {
  AVAILABLE_APPLIANCE_VALUES,
  COOKING_SKILL_LEVEL_VALUES,
  PREFERRED_COOKING_TIME_VALUES,
  TYPICAL_MEAL_TIME_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  AVAILABLE_APPLIANCE_LABELS,
  COOKING_SKILL_LEVEL_LABELS,
  PREFERRED_COOKING_TIME_LABELS,
  TYPICAL_MEAL_TIME_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  cookingSkillLevel: CookingSkillLevel | null;
  availableAppliances: AvailableAppliance[];
  preferredCookingTime: PreferredCookingTime | null;
  typicalMealTimes: TypicalMealTime[];
  onCookingSkillLevelChange: (v: CookingSkillLevel) => void;
  onAvailableAppliancesChange: (v: AvailableAppliance[]) => void;
  onPreferredCookingTimeChange: (v: PreferredCookingTime) => void;
  onTypicalMealTimesChange: (v: TypicalMealTime[]) => void;
};

export function StepKitchenReality({
  cookingSkillLevel,
  availableAppliances,
  preferredCookingTime,
  typicalMealTimes,
  onCookingSkillLevelChange,
  onAvailableAppliancesChange,
  onPreferredCookingTimeChange,
  onTypicalMealTimesChange,
}: Props) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          How would you describe your cooking skill?
        </p>
        <ChipSingleSelect
          options={COOKING_SKILL_LEVEL_VALUES}
          selected={cookingSkillLevel}
          onChange={onCookingSkillLevelChange}
          getLabel={(v) => COOKING_SKILL_LEVEL_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          What appliances do you have?
        </p>
        <ChipMultiSelect
          options={AVAILABLE_APPLIANCE_VALUES}
          selected={availableAppliances}
          onChange={onAvailableAppliancesChange}
          getLabel={(v) => AVAILABLE_APPLIANCE_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          How much time do you usually have to cook?
        </p>
        <ChipSingleSelect
          options={PREFERRED_COOKING_TIME_VALUES}
          selected={preferredCookingTime}
          onChange={onPreferredCookingTimeChange}
          getLabel={(v) => PREFERRED_COOKING_TIME_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Which meals do you typically cook?
        </p>
        <ChipMultiSelect
          options={TYPICAL_MEAL_TIME_VALUES}
          selected={typicalMealTimes}
          onChange={onTypicalMealTimesChange}
          getLabel={(v) => TYPICAL_MEAL_TIME_LABELS[v]}
        />
      </div>
    </div>
  );
}
