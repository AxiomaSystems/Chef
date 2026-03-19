import { BadRequestException } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { AggregationService } from '../aggregation/aggregation.service';
import { MatchingService } from '../matching/matching.service';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import { CartPersistenceService } from './cart.persistence';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let recipeService: jest.Mocked<RecipeService>;
  let userContextService: jest.Mocked<UserContextService>;
  let cartPersistenceService: jest.Mocked<CartPersistenceService>;

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
    } as unknown as jest.Mocked<UserContextService>;

    cartPersistenceService = {
      createDraft: jest.fn(),
      updateDraft: jest.fn(),
      deleteDraft: jest.fn(),
      findDraftsByUser: jest.fn(),
      findDraftById: jest.fn(),
      createCart: jest.fn().mockImplementation(async ({ userId, name, selections, dishes }) => ({
        id: 'cart-1',
        user_id: userId,
        name,
        selections,
        dishes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      updateCart: jest.fn(),
      deleteCart: jest.fn(),
      findCartsByUser: jest.fn(),
      findCartById: jest.fn(),
      createShoppingCart: jest.fn().mockImplementation(async ({ userId, cartId, shoppingCart }) => ({
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

    service = new CartService(
      recipeService,
      new AggregationService(),
      new MatchingService(),
      cartPersistenceService,
      userContextService,
    );
  });

  it('creates a cart with resolved dishes', async () => {
    recipeService.findManyByIds.mockResolvedValue([recipe]);

    const result = await service.createCart({
      name: 'Weekly dinner plan',
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
