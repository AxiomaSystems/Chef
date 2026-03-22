import { MatchingService } from './matching.service';
import { KrogerRetailerProductProvider } from './kroger-retailer-product.provider';
import { MockRetailerProductProvider } from './mock-retailer-product.provider';
import { WalmartRetailerProductProvider } from './walmart-retailer-product.provider';

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService(
      new MockRetailerProductProvider(),
      new KrogerRetailerProductProvider(),
      new WalmartRetailerProductProvider(),
    );
  });

  it('matches a mock catalog product and computes line totals', async () => {
    const [match] = await service.matchIngredients([
      {
        canonical_ingredient: 'rice',
        total_amount: 7,
        unit: 'cup',
        purchase_unit_hint: 'cup',
        source_dishes: [],
      },
    ], 'walmart');

    expect(match.selected_product?.product_id).toBe('walmart-rice-1');
    expect(match.selected_quantity).toBe(2);
    expect(match.estimated_line_total).toBe(7.96);
  });

  it('returns a fallback when no mock product exists', async () => {
    const [match] = await service.matchIngredients([
      {
        canonical_ingredient: 'unknown ingredient',
        total_amount: 1,
        unit: 'unit',
        source_dishes: [],
      },
    ], 'walmart');

    expect(match.selected_product).toBeNull();
    expect(match.fallback_used).toBe(true);
    expect(match.estimated_line_total).toBe(0);
  });

  it('converts compatible units before computing quantity', async () => {
    const [match] = await service.matchIngredients([
      {
        canonical_ingredient: 'aji amarillo paste',
        total_amount: 6,
        unit: 'tsp',
        source_dishes: [],
      },
    ], 'walmart');

    expect(match.selected_product?.product_id).toBe('walmart-aji-1');
    expect(match.matched_amount).toBe(22.5);
    expect(match.matched_unit).toBe('tsp');
    expect(match.selected_quantity).toBe(1);
    expect(match.fallback_used).toBe(true);
  });

  it('rejects absurd matches when the candidate does not share ingredient tokens', async () => {
    const serviceWithCustomProvider = new MatchingService(
      {
        retailer: 'walmart' as const,
        isEnabled: () => true,
        findCandidatesForIngredient: async () => [
          {
            product_id: 'bad-match-1',
            title: 'Chicken Dipping Sauce',
            price: 2.99,
            quantity_text: '12 oz',
            size_value: 12,
            size_unit: 'oz',
          },
        ],
        searchProducts: async () => [],
      } as unknown as MockRetailerProductProvider,
      new KrogerRetailerProductProvider(),
      new WalmartRetailerProductProvider(),
    );

    const [match] = await serviceWithCustomProvider.matchIngredients(
      [
        {
          canonical_ingredient: 'aji amarillo paste',
          total_amount: 3,
          unit: 'tbsp',
          source_dishes: [],
        },
      ],
      'walmart',
    );

    expect(match.selected_product).toBeNull();
    expect(match.estimated_line_total).toBe(0);
  });
});
