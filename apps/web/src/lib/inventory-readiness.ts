import type { DishIngredient, KitchenInventoryItem } from "@cart/shared";
import { inferIngredientCategory, normalizeIngredientKey } from "@cart/shared";

export type IngredientReadiness =
  | {
      status: "available";
      item: KitchenInventoryItem;
      alternative?: undefined;
    }
  | {
      status: "alternative";
      item?: undefined;
      alternative: KitchenInventoryItem;
      reason?: string;
      confidence?: "low" | "medium" | "high";
    }
  | {
      status: "missing";
      item?: undefined;
      alternative?: undefined;
    };

const ALTERNATIVE_CATEGORIES = new Set([
  "protein",
  "dairy-eggs",
  "produce",
  "fruit",
]);

export type InventoryAlternativeHint = {
  inventory_item_id: string | null;
  replacement_ingredient: string | null;
  confidence: "low" | "medium" | "high";
  reason: string;
};

function ingredientName(ingredient: DishIngredient) {
  return (
    ingredient.display_ingredient?.trim() ||
    ingredient.canonical_ingredient.trim()
  );
}

function itemName(item: KitchenInventoryItem) {
  return (
    item.ingredient?.canonical_name ||
    item.display_name ||
    item.label ||
    item.normalized_name
  );
}

function inventoryKeys(item: KitchenInventoryItem) {
  return [
    item.display_name,
    item.normalized_name,
    item.label,
    item.ingredient?.canonical_name,
    item.ingredient?.slug,
    ...(item.ingredient?.aliases ?? []),
  ]
    .filter(Boolean)
    .map((value) => normalizeIngredientKey(String(value)));
}

function recipeKeys(ingredient: DishIngredient) {
  return [ingredient.canonical_ingredient, ingredient.display_ingredient]
    .filter(Boolean)
    .map((value) => normalizeIngredientKey(String(value)));
}

function isSameIngredient(
  ingredient: DishIngredient,
  item: KitchenInventoryItem,
) {
  if (
    ingredient.ingredient_id &&
    item.ingredient_id &&
    ingredient.ingredient_id === item.ingredient_id
  ) {
    return true;
  }

  const ingredientCategory = inferIngredientCategory(
    ingredientName(ingredient),
  );
  const itemCategory =
    item.ingredient?.category || inferIngredientCategory(itemName(item));

  return recipeKeys(ingredient).some((recipeKey) =>
    inventoryKeys(item).some((inventoryKey) => {
      if (!recipeKey || !inventoryKey) return false;
      if (recipeKey === inventoryKey) return true;

      return (
        ingredientCategory === itemCategory &&
        (recipeKey.includes(inventoryKey) || inventoryKey.includes(recipeKey))
      );
    }),
  );
}

export function getIngredientReadiness(
  ingredient: DishIngredient,
  inventory: KitchenInventoryItem[],
  alternativeHint?: InventoryAlternativeHint,
): IngredientReadiness {
  const visibleInventory = inventory.filter(
    (item) =>
      item.review_status === "active" || item.review_status === "pending",
  );
  const exact = visibleInventory.find((item) =>
    isSameIngredient(ingredient, item),
  );

  if (exact) {
    return { status: "available", item: exact };
  }

  if (alternativeHint) {
    const alternative = alternativeHint.inventory_item_id
      ? visibleInventory.find(
          (item) => item.id === alternativeHint.inventory_item_id,
        )
      : visibleInventory.find(
          (item) =>
            alternativeHint.replacement_ingredient &&
            normalizeIngredientKey(itemName(item)) ===
              normalizeIngredientKey(alternativeHint.replacement_ingredient),
        );

    return alternative
      ? {
          status: "alternative",
          alternative,
          reason: alternativeHint.reason,
          confidence: alternativeHint.confidence,
        }
      : { status: "missing" };
  }

  const category = inferIngredientCategory(ingredientName(ingredient));

  if (ALTERNATIVE_CATEGORIES.has(category)) {
    const alternative = visibleInventory.find((item) => {
      const itemCategory =
        item.ingredient?.category || inferIngredientCategory(itemName(item));
      return itemCategory === category;
    });

    if (alternative) {
      return { status: "alternative", alternative };
    }
  }

  return { status: "missing" };
}

export function getIngredientReadinessSummary(
  ingredients: DishIngredient[],
  inventory: KitchenInventoryItem[],
  getAlternativeHint?: (
    ingredient: DishIngredient,
  ) => InventoryAlternativeHint | undefined,
) {
  return ingredients.reduce(
    (summary, ingredient) => {
      const readiness = getIngredientReadiness(
        ingredient,
        inventory,
        getAlternativeHint?.(ingredient),
      );
      summary[readiness.status] += 1;
      return summary;
    },
    { available: 0, alternative: 0, missing: 0 },
  );
}
