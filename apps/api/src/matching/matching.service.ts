import { Injectable } from '@nestjs/common';
import type {
  AggregatedIngredient,
  MatchedIngredientProduct,
  Retailer,
} from '@cart/shared';
import { MockRetailerProductProvider } from './mock-retailer-product.provider';
import { pickCandidate } from './candidate-selection';
import {
  mapMatchedIngredientProduct,
  mapMissingIngredientMatch,
} from './matching.mapper';
import { computeQuantity } from './quantity-estimation';
import { WalmartRetailerProductProvider } from './walmart-retailer-product.provider';

@Injectable()
export class MatchingService {
  constructor(
    private readonly mockProvider: MockRetailerProductProvider,
    private readonly walmartProvider: WalmartRetailerProductProvider,
  ) {}

  async matchIngredients(
    ingredients: AggregatedIngredient[],
  ): Promise<MatchedIngredientProduct[]> {
    return Promise.all(
      ingredients.map((ingredient) => this.matchIngredient(ingredient)),
    );
  }

  estimateSubtotal(items: MatchedIngredientProduct[]): number {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.estimated_line_total ?? 0),
      0,
    );

    return Number(subtotal.toFixed(2));
  }

  async searchProducts(retailer: Retailer, query: string) {
    return this.getProvider(retailer).searchProducts(query);
  }

  private async matchIngredient(
    ingredient: AggregatedIngredient,
  ): Promise<MatchedIngredientProduct> {
    const candidates = await this.getProvider('walmart').findCandidatesForIngredient(
      ingredient.canonical_ingredient,
    );
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

  private getProvider(retailer: Retailer) {
    if (retailer === 'walmart' && this.walmartProvider.isEnabled()) {
      return this.walmartProvider;
    }

    return this.mockProvider;
  }
}
