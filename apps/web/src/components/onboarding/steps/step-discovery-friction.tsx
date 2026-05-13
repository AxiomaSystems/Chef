"use client";

import type {
  BiggestCookingFrustration,
  RecipeDiscoverySource,
} from "@cart/shared";
import {
  BIGGEST_COOKING_FRUSTRATION_VALUES,
  RECIPE_DISCOVERY_SOURCE_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  BIGGEST_COOKING_FRUSTRATION_LABELS,
  RECIPE_DISCOVERY_SOURCE_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  recipeDiscoverySources: RecipeDiscoverySource[];
  biggestCookingFrustration: BiggestCookingFrustration | null;
  onRecipeDiscoverySourcesChange: (v: RecipeDiscoverySource[]) => void;
  onBiggestCookingFrustrationChange: (v: BiggestCookingFrustration) => void;
};

export function StepDiscoveryFriction({
  recipeDiscoverySources,
  biggestCookingFrustration,
  onRecipeDiscoverySourcesChange,
  onBiggestCookingFrustrationChange,
}: Props) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Where do you usually discover recipes?
        </p>
        <ChipMultiSelect
          options={RECIPE_DISCOVERY_SOURCE_VALUES}
          selected={recipeDiscoverySources}
          onChange={onRecipeDiscoverySourcesChange}
          getLabel={(v) => RECIPE_DISCOVERY_SOURCE_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          What&apos;s your biggest cooking frustration?
        </p>
        <ChipSingleSelect
          options={BIGGEST_COOKING_FRUSTRATION_VALUES}
          selected={biggestCookingFrustration}
          onChange={onBiggestCookingFrustrationChange}
          getLabel={(v) => BIGGEST_COOKING_FRUSTRATION_LABELS[v]}
        />
      </div>
    </div>
  );
}
