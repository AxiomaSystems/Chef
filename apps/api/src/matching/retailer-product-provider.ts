import type { ProductCandidate, Retailer } from '@cart/shared';

export interface RetailerProductProvider {
  readonly retailer: Retailer;
  isEnabled(): boolean;
  findCandidatesForIngredient(
    canonicalIngredient: string,
  ): Promise<ProductCandidate[]>;
  searchProducts(query: string): Promise<ProductCandidate[]>;
}
