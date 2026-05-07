import { CartExportService } from './cart-export.service';
import { InstacartCartExportProvider } from './instacart-cart-export.provider';

describe('CartExportService', () => {
  let instacartProvider: jest.Mocked<InstacartCartExportProvider>;
  let service: CartExportService;

  beforeEach(() => {
    instacartProvider = {
      createShoppingList: jest.fn(),
    } as unknown as jest.Mocked<InstacartCartExportProvider>;

    service = new CartExportService(instacartProvider);
  });

  it('delegates Instacart handoff creation to the Instacart provider', async () => {
    instacartProvider.createShoppingList.mockResolvedValue({
      externalUrl: 'https://instacart.example/list',
      externalReferenceId: 'cart-1',
    });

    await expect(
      service.createHandoff({
        cartId: 'cart-1',
        cartName: 'Dinner cart',
        retailer: 'instacart',
        overview: [
          {
            canonical_ingredient: 'rice',
            total_amount: 2,
            unit: 'cup',
            source_dishes: [],
          },
        ],
        dishes: [
          {
            id: 'recipe-1',
            name: 'Arroz con pollo',
            cuisine: 'Peruvian',
            servings: 4,
            ingredients: [],
            steps: [],
            tags: [],
          },
        ],
      }),
    ).resolves.toEqual({
      externalUrl: 'https://instacart.example/list',
      externalReferenceId: 'cart-1',
    });

    expect(instacartProvider.createShoppingList).toHaveBeenCalledWith({
      cartId: 'cart-1',
      title: 'Dinner cart',
      overview: [
        {
          canonical_ingredient: 'rice',
          total_amount: 2,
          unit: 'cup',
          source_dishes: [],
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: 'Arroz con pollo',
          cuisine: 'Peruvian',
          servings: 4,
          ingredients: [],
          steps: [],
          tags: [],
        },
      ],
    });
  });

  it('does not create external handoffs for non-Instacart retailers', async () => {
    await expect(
      service.createHandoff({
        cartId: 'cart-1',
        retailer: 'walmart',
        overview: [],
        dishes: [],
      }),
    ).resolves.toEqual({});

    expect(instacartProvider.createShoppingList).not.toHaveBeenCalled();
  });
});
