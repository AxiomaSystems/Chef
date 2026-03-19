import { BadRequestException } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import {
  buildDishesFromSelections,
  buildShoppingCartResponse,
  getBaseSelections,
} from './cart.runtime';

describe('cart.runtime', () => {
  const recipe: BaseRecipe = {
    id: 'recipe-1',
    owner_user_id: 'user-1',
    is_system_recipe: false,
    name: 'Arroz con pollo casero',
    cuisine: 'Peruvian',
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
    steps: [
      {
        step: 1,
        what_to_do: 'Brown the chicken thighs.',
      },
    ],
    tags: ['dinner'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('returns base selections only when all selections are base recipes', () => {
    const result = getBaseSelections({
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 2,
        },
      ],
    });

    expect(result).toEqual([
      {
        recipe_id: 'recipe-1',
        recipe_type: 'base',
        quantity: 2,
      },
    ]);
  });

  it('throws when a variant selection is present', () => {
    expect(() =>
      getBaseSelections({
        selections: [
          {
            recipe_id: 'recipe-1',
            recipe_type: 'variant',
            quantity: 1,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('builds scaled dishes from selections', () => {
    const dishes = buildDishesFromSelections([recipe], {
      selections: [
        {
          recipe_id: 'recipe-1',
          recipe_type: 'base',
          quantity: 2,
          servings_override: 2,
        },
      ],
    });

    expect(dishes).toHaveLength(2);
    expect(dishes[0]).toEqual(
      expect.objectContaining({
        id: 'recipe-1',
        servings: 2,
      }),
    );
    expect(dishes[0].ingredients).toEqual([
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

  it('throws when a selected recipe is unavailable', () => {
    expect(() =>
      buildDishesFromSelections([], {
        selections: [
          {
            recipe_id: 'missing-recipe',
            recipe_type: 'base',
            quantity: 1,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('builds the shopping cart response shape', () => {
    const response = buildShoppingCartResponse({
      cartId: 'cart-1',
      overview: [],
      matchedItems: [],
      estimatedSubtotal: 19.9,
      retailer: 'walmart',
    });

    expect(response).toEqual({
      cart_id: 'cart-1',
      overview: [],
      matched_items: [],
      estimated_subtotal: 19.9,
      retailer: 'walmart',
    });
  });
});
