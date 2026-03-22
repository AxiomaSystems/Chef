import type { ProductCandidate, Retailer } from '@cart/shared';

export type RetailerSearchContext = {
  zipCode?: string;
  locationId?: string;
};

export interface RetailerProductProvider {
  readonly retailer: Retailer;
  isEnabled(): boolean;
  findCandidatesForIngredient(
    canonicalIngredient: string,
    context?: RetailerSearchContext,
  ): Promise<ProductCandidate[]>;
  searchProducts(
    query: string,
    context?: RetailerSearchContext,
  ): Promise<ProductCandidate[]>;
}
