import type { AggregatedIngredient, ProductCandidate } from '@cart/shared';

export const computeQuantity = (
  ingredient: AggregatedIngredient,
  selectedProduct: ProductCandidate,
  convertedSizeValue: number | null,
): number => {
  if (selectedProduct.size_value && convertedSizeValue) {
    return Math.max(1, Math.ceil(ingredient.total_amount / convertedSizeValue));
  }

  return 1;
};
