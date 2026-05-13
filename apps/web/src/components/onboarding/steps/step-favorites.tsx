"use client";

import type { FavoriteFlavor, FavoriteProtein, SpiceLevel } from "@cart/shared";
import {
  FAVORITE_FLAVOR_VALUES,
  FAVORITE_PROTEIN_VALUES,
  SPICE_LEVEL_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  FAVORITE_FLAVOR_LABELS,
  FAVORITE_PROTEIN_LABELS,
  SPICE_LEVEL_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  favoriteProteins: FavoriteProtein[];
  favoriteFlavors: FavoriteFlavor[];
  spiceLevel: SpiceLevel | null;
  onFavoriteProteinsChange: (v: FavoriteProtein[]) => void;
  onFavoriteFlavorsChange: (v: FavoriteFlavor[]) => void;
  onSpiceLevelChange: (v: SpiceLevel) => void;
};

export function StepFavorites({
  favoriteProteins,
  favoriteFlavors,
  spiceLevel,
  onFavoriteProteinsChange,
  onFavoriteFlavorsChange,
  onSpiceLevelChange,
}: Props) {
  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Go-to proteins
        </p>
        <ChipMultiSelect
          options={FAVORITE_PROTEIN_VALUES}
          selected={favoriteProteins}
          onChange={onFavoriteProteinsChange}
          getLabel={(v) => FAVORITE_PROTEIN_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Flavors you want more often
        </p>
        <ChipMultiSelect
          options={FAVORITE_FLAVOR_VALUES}
          selected={favoriteFlavors}
          onChange={onFavoriteFlavorsChange}
          getLabel={(v) => FAVORITE_FLAVOR_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Spice tolerance
        </p>
        <ChipSingleSelect
          options={SPICE_LEVEL_VALUES}
          selected={spiceLevel}
          onChange={onSpiceLevelChange}
          getLabel={(v) => SPICE_LEVEL_LABELS[v]}
        />
      </div>
    </div>
  );
}
