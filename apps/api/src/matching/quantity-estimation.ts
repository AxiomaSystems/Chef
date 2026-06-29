import type { AggregatedIngredient, ProductCandidate } from '@cart/shared';

export const computeQuantity = (
  ingredient: AggregatedIngredient,
  selectedProduct: ProductCandidate,
  convertedSizeValue: number | null,
): number => {
  if (
    ingredient.total_amount === undefined ||
    ingredient.total_amount === null
  ) {
    return 0;
  }

  if (selectedProduct.size_value && convertedSizeValue) {
    return Math.max(1, Math.ceil(ingredient.total_amount / convertedSizeValue));
  }

  return 1;
};
