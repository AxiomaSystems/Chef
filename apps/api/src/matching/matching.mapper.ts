import type {
  AggregatedIngredient,
  MatchedIngredientProduct,
} from '@cart/shared';
import type { CandidateMatch } from './matching.types';

export const mapMissingIngredientMatch = (
  ingredient: AggregatedIngredient,
): MatchedIngredientProduct => ({
  canonical_ingredient: ingredient.canonical_ingredient,
  needed_amount: ingredient.total_amount,
  needed_unit: ingredient.unit,
  purchase_unit_hint: ingredient.purchase_unit_hint,
  walmart_search_query: ingredient.canonical_ingredient,
  selected_product: null,
  selected_quantity: 0,
  estimated_line_total: 0,
  fallback_used: true,
  notes: 'No mock catalog candidate found',
});

export const mapMatchedIngredientProduct = (
  ingredient: AggregatedIngredient,
  selectedMatch: CandidateMatch,
  selectedQuantity: number,
): MatchedIngredientProduct => {
  const estimatedLineTotal = Number(
    (selectedMatch.product.price * selectedQuantity).toFixed(2),
  );
  const usedFallback =
    selectedMatch.product.size_unit !== ingredient.unit ||
    selectedMatch.convertedSizeValue === null;

  return {
    canonical_ingredient: ingredient.canonical_ingredient,
    needed_amount: ingredient.total_amount,
    needed_unit: ingredient.unit,
    matched_amount: selectedMatch.convertedSizeValue ?? undefined,
    matched_unit: ingredient.unit,
    purchase_unit_hint: ingredient.purchase_unit_hint,
    walmart_search_query: ingredient.canonical_ingredient,
    selected_product: selectedMatch.product,
    selected_quantity: selectedQuantity,
    estimated_line_total: estimatedLineTotal,
    fallback_used: usedFallback || undefined,
    notes: usedFallback
      ? selectedMatch.convertedSizeValue !== null
        ? `Matched using converted ${selectedMatch.product.size_unit ?? 'unknown'} package size`
        : `Matched using ${selectedMatch.product.size_unit ?? 'unknown'} package size`
      : undefined,
  };
};
