import { Injectable } from '@nestjs/common';
import type { ProductCandidate } from '@cart/shared';
import { mockCatalog } from './mock-catalog';
import type { RetailerProductProvider } from './retailer-product-provider';

@Injectable()
export class MockRetailerProductProvider implements RetailerProductProvider {
  readonly retailer = 'walmart' as const;

  isEnabled() {
    return true;
  }

  async findCandidatesForIngredient(canonicalIngredient: string) {
    return mockCatalog[canonicalIngredient] ?? [];
  }

  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    const seen = new Set<string>();

    return Object.entries(mockCatalog)
      .flatMap(([canonicalIngredient, candidates]) =>
        candidates.map((candidate) => ({
          canonicalIngredient,
          candidate,
          haystack: [
            canonicalIngredient,
            candidate.title,
            candidate.brand,
            candidate.quantity_text,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        })),
      )
      .map((entry) => ({
        ...entry,
        score: terms.reduce((score, term) => {
          if (entry.canonicalIngredient.includes(term)) {
            return score + 4;
          }
          if (entry.candidate.title.toLowerCase().includes(term)) {
            return score + 3;
          }
          if (entry.candidate.brand?.toLowerCase().includes(term)) {
            return score + 2;
          }
          if (entry.haystack.includes(term)) {
            return score + 1;
          }
          return score;
        }, 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.candidate.price - right.candidate.price;
      })
      .map((entry) => entry.candidate)
      .filter((candidate) => {
        if (seen.has(candidate.product_id)) {
          return false;
        }
        seen.add(candidate.product_id);
        return true;
      })
      .slice(0, 12);
  }
}
