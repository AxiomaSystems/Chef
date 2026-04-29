"use client";

import type {
  DislikedIngredient,
  DislikedTexture,
  FavoriteFlavor,
  FavoriteProtein,
  SpiceLevel,
} from "@cart/shared";
import {
  DISLIKED_INGREDIENT_VALUES,
  DISLIKED_TEXTURE_VALUES,
  FAVORITE_FLAVOR_VALUES,
  FAVORITE_PROTEIN_VALUES,
  SPICE_LEVEL_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  DISLIKED_INGREDIENT_LABELS,
  DISLIKED_TEXTURE_LABELS,
  FAVORITE_FLAVOR_LABELS,
  FAVORITE_PROTEIN_LABELS,
  SPICE_LEVEL_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  favoriteProteins: FavoriteProtein[];
  favoriteFlavors: FavoriteFlavor[];
  spiceLevel: SpiceLevel | null;
  dislikedIngredients: DislikedIngredient[];
  dislikedTextures: DislikedTexture[];
  onFavoriteProteinsChange: (v: FavoriteProtein[]) => void;
  onFavoriteFlavorsChange: (v: FavoriteFlavor[]) => void;
  onSpiceLevelChange: (v: SpiceLevel) => void;
  onDislikedIngredientsChange: (v: DislikedIngredient[]) => void;
  onDislikedTexturesChange: (v: DislikedTexture[]) => void;
};

export function StepTasteDislikes({
  favoriteProteins,
  favoriteFlavors,
  spiceLevel,
  dislikedIngredients,
  dislikedTextures,
  onFavoriteProteinsChange,
  onFavoriteFlavorsChange,
  onSpiceLevelChange,
  onDislikedIngredientsChange,
  onDislikedTexturesChange,
}: Props) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Favourite proteins
        </p>
        <ChipMultiSelect
          options={FAVORITE_PROTEIN_VALUES}
          selected={favoriteProteins}
          onChange={onFavoriteProteinsChange}
          getLabel={(v) => FAVORITE_PROTEIN_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Favourite flavour profiles
        </p>
        <ChipMultiSelect
          options={FAVORITE_FLAVOR_VALUES}
          selected={favoriteFlavors}
          onChange={onFavoriteFlavorsChange}
          getLabel={(v) => FAVORITE_FLAVOR_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Spice tolerance
        </p>
        <ChipSingleSelect
          options={SPICE_LEVEL_VALUES}
          selected={spiceLevel}
          onChange={onSpiceLevelChange}
          getLabel={(v) => SPICE_LEVEL_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
          Ingredients you avoid
        </p>
        <p className="text-body-sm text-[#85736c]">
          Pick anything you dislike or can&apos;t eat.
        </p>
        <ChipMultiSelect
          options={DISLIKED_INGREDIENT_VALUES}
          selected={dislikedIngredients}
          onChange={onDislikedIngredientsChange}
          getLabel={(v) => DISLIKED_INGREDIENT_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#52443d]">
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
