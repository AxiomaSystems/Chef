import { Injectable } from '@nestjs/common';
import type {
  AggregatedIngredient,
  MatchedIngredientProduct,
} from '@cart/shared';
import { mockCatalog } from './mock-catalog';
import { pickCandidate } from './candidate-selection';
import {
  mapMatchedIngredientProduct,
  mapMissingIngredientMatch,
} from './matching.mapper';
import { computeQuantity } from './quantity-estimation';

@Injectable()
export class MatchingService {
  matchIngredients(
    ingredients: AggregatedIngredient[],
  ): MatchedIngredientProduct[] {
    return ingredients.map((ingredient) => this.matchIngredient(ingredient));
  }

  estimateSubtotal(items: MatchedIngredientProduct[]): number {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.estimated_line_total ?? 0),
      0,
    );

    return Number(subtotal.toFixed(2));
  }

  private matchIngredient(
    ingredient: AggregatedIngredient,
  ): MatchedIngredientProduct {
    const candidates = mockCatalog[ingredient.canonical_ingredient] ?? [];
    const selectedMatch = pickCandidate(ingredient, candidates);

    if (!selectedMatch) {
      return mapMissingIngredientMatch(ingredient);
    }

    const selectedQuantity = computeQuantity(
      ingredient,
      selectedMatch.product,
      selectedMatch.convertedSizeValue,
    );

    return mapMatchedIngredientProduct(ingredient, selectedMatch, selectedQuantity);
  }
}
