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
        canonical_ingredient: 'red wine vinegar',
        total_amount: 6,
        unit: 'tsp',
        source_dishes: [],
      },
    ], 'walmart');

    expect(match.selected_product?.product_id).toBe('walmart-vinegar-1');
    expect(match.matched_amount).toBe(48);
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

  it('rejects prepared potato products for raw potato ingredients', async () => {
    const serviceWithCustomProvider = new MatchingService(
      {
        retailer: 'walmart' as const,
        isEnabled: () => true,
        findCandidatesForIngredient: async () => [
          {
            product_id: 'bad-potato-1',
            title: 'Classic Yellow Potato Salad',
            price: 4.99,
            quantity_text: '1 lb',
            size_value: 1,
            size_unit: 'lb',
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
          canonical_ingredient: 'yellow potato',
          total_amount: 4,
          unit: 'unit',
          source_dishes: [],
        },
      ],
      'walmart',
    );

    expect(match.selected_product).toBeNull();
  });

  it('rejects rice mixes for plain rice ingredients', async () => {
    const serviceWithCustomProvider = new MatchingService(
      {
        retailer: 'walmart' as const,
        isEnabled: () => true,
        findCandidatesForIngredient: async () => [
          {
            product_id: 'bad-rice-1',
            title: 'Rice-A-Roni Rice Pilaf',
            price: 1.99,
            quantity_text: '7.2 oz',
            size_value: 7.2,
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
          canonical_ingredient: 'rice',
          total_amount: 2,
          unit: 'cup',
          source_dishes: [],
        },
      ],
      'walmart',
    );

    expect(match.selected_product).toBeNull();
  });

  it('skips specialty ingredients that should not be auto-matched in standard grocery catalogs', async () => {
    const provider = {
      retailer: 'walmart' as const,
      isEnabled: () => true,
      findCandidatesForIngredient: jest.fn(async () => [
        {
          product_id: 'unexpected-match',
          title: 'Some Aji Product',
          price: 9.99,
        },
      ]),
      searchProducts: async () => [],
    } as unknown as MockRetailerProductProvider;

    const serviceWithCustomProvider = new MatchingService(
      provider,
      new KrogerRetailerProductProvider(),
      new WalmartRetailerProductProvider(),
    );

    const [match] = await serviceWithCustomProvider.matchIngredients(
      [
        {
          canonical_ingredient: 'aji limo',
          total_amount: 1,
          unit: 'unit',
          source_dishes: [],
        },
      ],
      'walmart',
    );

    expect(match.selected_product).toBeNull();
    expect((provider.findCandidatesForIngredient as jest.Mock).mock.calls.length).toBe(0);
  });

  it('tries near-equivalent rewrite queries for corn on the cob cases', async () => {
    const provider = {
      retailer: 'walmart' as const,
      isEnabled: () => true,
      findCandidatesForIngredient: jest.fn(async (query: string) => {
        if (query === 'corn on the cob') {
          return [
            {
              product_id: 'good-corn-1',
              title: 'Fresh Corn on the Cob',
              price: 3.99,
              quantity_text: '4 each',
              size_value: 4,
              size_unit: 'unit',
            },
          ];
        }

        return [];
      }),
      searchProducts: async () => [],
    } as unknown as MockRetailerProductProvider;

    const serviceWithCustomProvider = new MatchingService(
      provider,
      new KrogerRetailerProductProvider(),
      new WalmartRetailerProductProvider(),
    );

    const [match] = await serviceWithCustomProvider.matchIngredients(
      [
        {
          canonical_ingredient: 'corn',
          total_amount: 2,
          unit: 'ear',
          source_dishes: [],
        },
      ],
      'walmart',
    );

    expect(match.selected_product?.product_id).toBe('good-corn-1');
    expect((provider.findCandidatesForIngredient as jest.Mock).mock.calls[0]?.[0]).toBe(
      'corn on the cob',
    );
  });
});
