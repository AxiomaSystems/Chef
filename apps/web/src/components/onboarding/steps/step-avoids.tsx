"use client";

import type { DislikedIngredient, DislikedTexture } from "@cart/shared";
import {
  DISLIKED_INGREDIENT_VALUES,
  DISLIKED_TEXTURE_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import {
  DISLIKED_INGREDIENT_LABELS,
  DISLIKED_TEXTURE_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  dislikedIngredients: DislikedIngredient[];
  dislikedTextures: DislikedTexture[];
  onDislikedIngredientsChange: (v: DislikedIngredient[]) => void;
  onDislikedTexturesChange: (v: DislikedTexture[]) => void;
};

export function StepAvoids({
  dislikedIngredients,
  dislikedTextures,
  onDislikedIngredientsChange,
  onDislikedTexturesChange,
}: Props) {
  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Ingredients to avoid
        </p>
        <ChipMultiSelect
          options={DISLIKED_INGREDIENT_VALUES}
          selected={dislikedIngredients}
          onChange={onDislikedIngredientsChange}
          getLabel={(v) => DISLIKED_INGREDIENT_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Textures you dislike
        </p>
        <ChipMultiSelect
          options={DISLIKED_TEXTURE_VALUES}
          selected={dislikedTextures}
          onChange={onDislikedTexturesChange}
          getLabel={(v) => DISLIKED_TEXTURE_LABELS[v]}
        />
      </div>
    </div>
  );
}
