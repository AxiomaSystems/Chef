import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { AggregationService } from '../aggregation/aggregation.service';
import { CartExportService } from '../cart-export/cart-export.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { KrogerRetailerProductProvider } from '../matching/kroger-retailer-product.provider';
import { MockRetailerProductProvider } from '../matching/mock-retailer-product.provider';
import { MatchingService } from '../matching/matching.service';
import { WalmartRetailerProductProvider } from '../matching/walmart-retailer-product.provider';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import { CartPersistenceService } from './cart.persistence';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let recipeService: jest.Mocked<RecipeService>;
  let userContextService: jest.Mocked<UserContextService>;
  let cartPersistenceService: jest.Mocked<CartPersistenceService>;
  let cartExportService: jest.Mocked<CartExportService>;
  let ingredientsService: jest.Mocked<IngredientsService>;

  const recipe: BaseRecipe = {
    id: 'recipe-1',
    owner_user_id: 'user-1',
    is_system_recipe: false,
    name: 'Arroz con pollo casero',
    cuisine_id: 'cuisine-peruvian',
    cuisine: {
      id: 'cuisine-peruvian',
      slug: 'peruvian',
      label: 'Peruvian',
      kind: 'national',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    description: 'Test recipe',
    servings: 4,
    ingredients: [
      {
        ingredient_id: 'ingredient-rice',
        canonical_ingredient: 'rice',
        amount: 2,
        unit: 'cup',
      },
      {
        canonical_ingredient: 'chicken thigh',
        amount: 800,
        unit: 'g',
      },
    ],
    steps: [],
    tag_ids: ['tag-1'],
    tags: [
      {
        id: 'tag-1',
        name: 'Test',
        slug: 'test',
        scope: 'system',
        kind: 'general',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    recipeService = {
      findManyByIds: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    userContextService = {
      resolveActorUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      resolveActorUserShoppingContext: jest.fn().mockResolvedValue({
        id: 'user-1',
        preferredZipCode: '60611',
        preferredLocationLabel: 'Chicago, IL',
        preferredLatitude: null,
        preferredLongitude: null,
        preferredKrogerLocationId: null,
      }),
    } as unknown as jest.Mocked<UserContextService>;

    cartPersistenceService = {
      createDraft: jest.fn(),
      updateDraft: jest.fn(),
      deleteDraft: jest.fn(),
      findDraftsByUser: jest.fn(),
      findDraftById: jest.fn(),
      createCart: jest
        .fn()
        .mockImplementation(
          async ({ userId, name, retailer, selections, dishes }) => ({
            id: 'cart-1',
            user_id: userId,
            name,
            retailer,
            selections,
            dishes,
            overview: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        ),
      updateCart: jest.fn(),
      deleteCart: jest.fn(),
      upsertIngredientReview: jest.fn(),
      findCartsByUser: jest.fn(),
      findCartById: jest.fn(),
      findIngredientReviewByCartId: jest.fn().mockResolvedValue(null),
      createShoppingCart: jest
        .fn()
        .mockImplementation(async ({ userId, cartId, shoppingCart }) => ({
          id: 'shopping-cart-1',
          user_id: userId,
          cart_id: cartId,
          ...shoppingCart,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      findShoppingCartsByUser: jest.fn(),
      findShoppingCartHistoryByUser: jest.fn(),
      findShoppingCartById: jest.fn(),
    } as unknown as jest.Mocked<CartPersistenceService>;

    cartExportService = {
      isProviderEnabled: jest.fn().mockReturnValue(true),
      getProviderReadiness: jest.fn().mockReturnValue({
        retailer: 'instacart',
        status: 'configured',
        isAvailable: true,
      }),
      createHandoff: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<CartExportService>;

    ingredientsService = {
      listInventory: jest.fn().mockResolvedValue([]),
      listInventoryIngredientSlugs: jest.fn().mockResolvedValue(new Set()),
      normalizeSlug: jest.fn().mockImplementation((value: string) =>
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      ),
    } as unknown as jest.Mocked<IngredientsService>;

    service = new CartService(
      recipeService,
      new AggregationService(),
      ingredientsService,
      new MatchingService(
        new MockRetailerProductProvider(),
        new KrogerRetailerProductProvider(),
        new WalmartRetailerProductProvider(),
      ),
      cartExportService,
      cartPersistenceService,
      userContextService,
    );
  });

  it('creates a cart with resolved dishes', async () => {
    recipeService.findManyByIds.mockResolvedValue([recipe]);

    const result = await service.createCart({
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 2,
        },
      ],
    });

    expect(result.dishes).toHaveLength(2);
    expect(result.selections).toHaveLength(1);
    expect(cartPersistenceService.createCart).toHaveBeenCalledTimes(1);
  });

  it('creates a shopping cart from a persisted cart', async () => {
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 2,
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await service.createShoppingCart('cart-1', {
      retailer: 'walmart',
    });

    expect(result.cart_id).toBe('cart-1');
    expect(result.matched_items.length).toBeGreaterThan(0);
    expect(cartPersistenceService.createShoppingCart).toHaveBeenCalledTimes(1);
  });

  it('requires shopping location before generating a Kroger shopping cart', async () => {
    (
      userContextService.resolveActorUserShoppingContext as jest.Mock
    ).mockResolvedValue({
      id: 'user-1',
      preferredZipCode: null,
      preferredLocationLabel: null,
      preferredLatitude: null,
      preferredLongitude: null,
      preferredKrogerLocationId: null,
    });

    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'kroger',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 1,
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      service.createShoppingCart('cart-1', { retailer: 'kroger' }),
    ).rejects.toThrow(
      'Set your shopping location first before using Kroger search.',
    );
  });

  it('fails clearly when Kroger credentials are missing', () => {
    jest
      .spyOn(service['matchingService'], 'getProviderReadiness')
      .mockReturnValue({
        retailer: 'kroger',
        status: 'missing_credentials',
        isAvailable: false,
      });

    expect(() =>
      service['buildRetailerSearchContext']('kroger', '60611', null),
    ).toThrow(
      'Kroger search is unavailable because provider credentials are missing.',
    );
  });

  it('fails clearly when Instacart handoff is missing credentials', async () => {
    cartExportService.getProviderReadiness = jest.fn().mockReturnValue({
      retailer: 'instacart',
      status: 'missing_credentials',
      isAvailable: false,
    });

    expect(() =>
      service['buildRetailerSearchContext']('instacart', '60611', null),
    ).toThrow(
      'Instacart handoff is unavailable because provider credentials are missing.',
    );
  });

  it('applies ingredient review decisions before product matching', async () => {
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 1,
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    cartPersistenceService.findIngredientReviewByCartId.mockResolvedValue({
      cart_id: 'cart-1',
      items: [
        {
          canonical_ingredient: 'rice',
          total_amount: 2,
          unit: 'cup',
          source_dishes: [{ dish_name: recipe.name, amount: 2, unit: 'cup' }],
          action: 'already_have',
        },
        {
          canonical_ingredient: 'chicken thigh',
          total_amount: 800,
          unit: 'g',
          source_dishes: [{ dish_name: recipe.name, amount: 800, unit: 'g' }],
          action: 'adjust',
          adjusted_amount: 400,
          adjusted_unit: 'g',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await service.createShoppingCart('cart-1', { retailer: 'walmart' });

    const createdShoppingCart =
      cartPersistenceService.createShoppingCart.mock.calls[0][0].shoppingCart;
    expect(createdShoppingCart.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredient_id: 'ingredient-rice',
          canonical_ingredient: 'rice',
          in_kitchen: true,
          review_action: 'already_have',
        }),
        expect.objectContaining({
          canonical_ingredient: 'chicken thigh',
          total_amount: 400,
          review_action: 'adjust',
        }),
      ]),
    );
    expect(createdShoppingCart.matched_items).toHaveLength(1);
    expect(createdShoppingCart.matched_items[0]).toEqual(
      expect.objectContaining({
        canonical_ingredient: 'chicken thigh',
        needed_amount: 400,
      }),
    );
  });

  it('deducts matching kitchen inventory quantities before product matching', async () => {
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    ingredientsService.listInventory.mockResolvedValue([
      {
        id: 'inventory-rice',
        user_id: 'user-1',
        ingredient_id: 'ingredient-rice',
        display_name: 'rice',
        normalized_name: 'rice',
        ingredient: {
          id: 'ingredient-rice',
          canonical_name: 'rice',
          slug: 'rice',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        estimated_amount: 1,
        unit: 'cup',
        source: 'manual',
        confidence: 'high',
        review_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    await service.createShoppingCart('cart-1', { retailer: 'walmart' });

    const createdShoppingCart =
      cartPersistenceService.createShoppingCart.mock.calls[0][0].shoppingCart;
    expect(createdShoppingCart.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          inventory_amount: 1,
          inventory_unit: 'cup',
          remaining_to_buy: 1,
          deduction_possible: true,
        }),
      ]),
    );
    expect(createdShoppingCart.matched_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          needed_amount: 1,
        }),
      ]),
    );
  });

  it('deducts kitchen inventory by ingredient id before falling back to name matching', async () => {
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: [
            {
              ingredient_id: 'ingredient-rice',
              canonical_ingredient: 'white rice',
              amount: 2,
              unit: 'cup',
            },
          ],
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    ingredientsService.listInventory.mockResolvedValue([
      {
        id: 'inventory-rice',
        user_id: 'user-1',
        ingredient_id: 'ingredient-rice',
        display_name: 'rice',
        normalized_name: 'rice',
        ingredient: {
          id: 'ingredient-rice',
          canonical_name: 'rice',
          slug: 'rice',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        estimated_amount: 1,
        unit: 'cup',
        source: 'manual',
        confidence: 'high',
        review_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    await service.createShoppingCart('cart-1', { retailer: 'walmart' });

    const createdShoppingCart =
      cartPersistenceService.createShoppingCart.mock.calls[0][0].shoppingCart;
    expect(createdShoppingCart.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredient_id: 'ingredient-rice',
          canonical_ingredient: 'white rice',
          inventory_amount: 1,
          remaining_to_buy: 1,
        }),
      ]),
    );
  });

  it('does not reuse the same inventory quantity across cart ingredients', async () => {
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'walmart',
      selections: [],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: [
            {
              ingredient_id: 'ingredient-rice',
              canonical_ingredient: 'rice',
              amount: 1,
              unit: 'cup',
            },
            {
              ingredient_id: 'ingredient-rice',
              canonical_ingredient: 'rice',
              amount: 16,
              unit: 'tbsp',
            },
          ],
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    ingredientsService.listInventory.mockResolvedValue([
      {
        id: 'inventory-rice',
        user_id: 'user-1',
        ingredient_id: 'ingredient-rice',
        display_name: 'rice',
        normalized_name: 'rice',
        ingredient: {
          id: 'ingredient-rice',
          canonical_name: 'rice',
          slug: 'rice',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        estimated_amount: 1,
        unit: 'cup',
        source: 'manual',
        confidence: 'high',
        review_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    await service.createShoppingCart('cart-1', { retailer: 'walmart' });

    const createdShoppingCart =
      cartPersistenceService.createShoppingCart.mock.calls[0][0].shoppingCart;
    expect(createdShoppingCart.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          unit: 'cup',
          remaining_to_buy: 0,
        }),
        expect.objectContaining({
          canonical_ingredient: 'rice',
          unit: 'tbsp',
          remaining_to_buy: 16,
        }),
      ]),
    );
    expect(createdShoppingCart.matched_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          needed_amount: 16,
          needed_unit: 'tbsp',
        }),
      ]),
    );
  });

  it('creates an Instacart handoff shopping cart without product matching', async () => {
    cartExportService.createHandoff.mockResolvedValue({
      externalUrl: 'https://www.instacart.com/store/products/example',
      externalReferenceId: 'cart-1',
    });
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'instacart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 1,
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await service.createShoppingCart('cart-1', {
      retailer: 'instacart',
    });

    expect(result.retailer).toBe('instacart');
    expect(result.external_url).toBe(
      'https://www.instacart.com/store/products/example',
    );
    expect(result.estimated_subtotal).toBe(0);
    expect(cartExportService.createHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        cartId: 'cart-1',
        retailer: 'instacart',
      }),
    );
  });

  it('does not persist a shopping cart when Instacart handoff is unavailable', async () => {
    cartExportService.getProviderReadiness.mockReturnValue({
      retailer: 'instacart',
      status: 'missing_credentials',
      isAvailable: false,
    });
    cartPersistenceService.findCartById.mockResolvedValue({
      id: 'cart-1',
      user_id: 'user-1',
      name: 'Weekly dinner plan',
      retailer: 'instacart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 1,
        },
      ],
      dishes: [
        {
          id: 'recipe-1',
          name: recipe.name,
          cuisine: recipe.cuisine.label,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags.map((tag) => tag.name),
        },
      ],
      overview: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      service.createShoppingCart('cart-1', { retailer: 'instacart' }),
    ).rejects.toThrow(
      'Instacart handoff is unavailable because provider credentials are missing.',
    );
    expect(cartExportService.createHandoff).not.toHaveBeenCalled();
    expect(cartPersistenceService.createShoppingCart).not.toHaveBeenCalled();
  });

  it('rejects Instacart product search with an actionable handoff message', async () => {
    await expect(
      service.searchRetailerProducts('instacart', 'rice'),
    ).rejects.toThrow(
      'Instacart product search is not supported yet. Generate an Instacart handoff from a cart instead.',
    );
    expect(
      userContextService.resolveActorUserShoppingContext,
    ).not.toHaveBeenCalled();
  });

  it('lists shopping cart history summaries', async () => {
    cartPersistenceService.findShoppingCartHistoryByUser.mockResolvedValue([
      {
        id: 'shopping-cart-1',
        user_id: 'user-1',
        cart_id: 'cart-1',
        retailer: 'walmart',
        estimated_subtotal: 19.9,
        overview_count: 2,
        matched_item_count: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const result = await service.listShoppingCartHistory();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'shopping-cart-1',
        estimated_subtotal: 19.9,
      }),
    ]);
  });

  it('scales servings_override before cart persistence', async () => {
    recipeService.findManyByIds.mockResolvedValue([recipe]);

    const result = await service.createCart({
      retailer: 'walmart',
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 1,
          servings_override: 2,
        },
      ],
    });

    expect(result.dishes[0].ingredients).toEqual([
      expect.objectContaining({
        canonical_ingredient: 'rice',
        amount: 1,
      }),
      expect.objectContaining({
        canonical_ingredient: 'chicken thigh',
        amount: 400,
      }),
    ]);
  });

  it('throws when a requested recipe is not visible', async () => {
    recipeService.findManyByIds.mockResolvedValue([]);

    await expect(
      service.createCart({
        retailer: 'walmart',
        selections: [
          {
            recipe_id: 'missing-recipe',
            recipe_type: 'base',
            quantity: 1,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
