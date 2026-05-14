"use client";

import type { PreferredStore, ShoppingMode, WeeklyBudget } from "@cart/shared";
import {
  PREFERRED_STORE_VALUES,
  SHOPPING_MODE_VALUES,
  WEEKLY_BUDGET_VALUES,
} from "@cart/shared";
import { ChipMultiSelect } from "@/components/onboarding/ui/chip-multi-select";
import { ChipSingleSelect } from "@/components/onboarding/ui/chip-single-select";
import {
  PREFERRED_STORE_LABELS,
  SHOPPING_MODE_LABELS,
  WEEKLY_BUDGET_LABELS,
} from "@/components/onboarding/labels";

type Props = {
  weeklyBudget: WeeklyBudget | null;
  preferredStores: PreferredStore[];
  shoppingMode: ShoppingMode | null;
  onWeeklyBudgetChange: (v: WeeklyBudget) => void;
  onPreferredStoresChange: (v: PreferredStore[]) => void;
  onShoppingModeChange: (v: ShoppingMode) => void;
};

export function StepShoppingBehavior({
  weeklyBudget,
  preferredStores,
  shoppingMode,
  onWeeklyBudgetChange,
  onPreferredStoresChange,
  onShoppingModeChange,
}: Props) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          What&apos;s your weekly grocery budget?
        </p>
        <ChipSingleSelect
          options={WEEKLY_BUDGET_VALUES}
          selected={weeklyBudget}
          onChange={onWeeklyBudgetChange}
          getLabel={(v) => WEEKLY_BUDGET_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          Where do you usually shop?
        </p>
        <ChipMultiSelect
          options={PREFERRED_STORE_VALUES}
          selected={preferredStores}
          onChange={onPreferredStoresChange}
          getLabel={(v) => PREFERRED_STORE_LABELS[v]}
        />
      </div>

      <div className="grid gap-3">
        <p className="text-label-lg font-semibold text-[#315f62]">
          How do you prefer to shop?
        </p>
        <ChipSingleSelect
          options={SHOPPING_MODE_VALUES}
          selected={shoppingMode}
          onChange={onShoppingModeChange}
          getLabel={(v) => SHOPPING_MODE_LABELS[v]}
        />
      </div>
    </div>
  );
}
