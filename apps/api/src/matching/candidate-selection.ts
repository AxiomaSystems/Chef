import type { AggregatedIngredient, ProductCandidate } from '@cart/shared';
import type { CandidateMatch } from './matching.types';
import { convertUnit } from './unit-conversion';

const convertCandidateSize = (
  ingredient: AggregatedIngredient,
  candidate: ProductCandidate,
): number | null => {
  if (!candidate.size_value || !candidate.size_unit) {
    return null;
  }

  return convertUnit(candidate.size_value, candidate.size_unit, ingredient.unit);
};

export const pickCandidate = (
  ingredient: AggregatedIngredient,
  candidates: ProductCandidate[],
): CandidateMatch | null => {
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .slice()
    .map((candidate) => ({
      product: candidate,
      convertedSizeValue: convertCandidateSize(ingredient, candidate),
    }))
    .sort((left, right) => {
      const leftConvertible = left.convertedSizeValue !== null ? 0 : 1;
      const rightConvertible = right.convertedSizeValue !== null ? 0 : 1;

      if (leftConvertible !== rightConvertible) {
        return leftConvertible - rightConvertible;
      }

      const leftUnitPenalty = left.product.size_unit === ingredient.unit ? 0 : 1;
      const rightUnitPenalty = right.product.size_unit === ingredient.unit ? 0 : 1;

      if (leftUnitPenalty !== rightUnitPenalty) {
        return leftUnitPenalty - rightUnitPenalty;
      }

      return left.product.price - right.product.price;
    })[0];
};
