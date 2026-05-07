"use client";

import type { HouseholdSize, KidsProfile } from "@cart/shared";
import { HOUSEHOLD_SIZE_VALUES, KIDS_PROFILE_VALUES } from "@cart/shared";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  HOUSEHOLD_SIZE_LABELS,
  KIDS_PROFILE_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  householdSize: HouseholdSize | null;
  kidsProfile: KidsProfile | null;
  onHouseholdSizeChange: (value: HouseholdSize) => void;
  onKidsProfileChange: (value: KidsProfile) => void;
};

export function StepHousehold({
  householdSize,
  kidsProfile,
  onHouseholdSizeChange,
  onKidsProfileChange,
}: Props) {
  const isJustMe = householdSize === "just_me";

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Who are you cooking for?
        </p>
        <ChipSingleSelect
          options={HOUSEHOLD_SIZE_VALUES}
          selected={householdSize}
          onChange={onHouseholdSizeChange}
          getLabel={(v) => HOUSEHOLD_SIZE_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Any kids in the household?
        </p>
        <ChipSingleSelect
          options={KIDS_PROFILE_VALUES}
          selected={isJustMe ? "no_kids" : kidsProfile}
          onChange={onKidsProfileChange}
          getLabel={(v) => KIDS_PROFILE_LABELS[v]}
          isOptionDisabled={() => isJustMe}
        />
      </div>
    </div>
  );
}
