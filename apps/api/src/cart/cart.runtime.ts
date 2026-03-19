import { BadRequestException } from '@nestjs/common';
import type {
  BaseRecipe,
  Cart,
  CartSelection,
  Dish,
  ShoppingCart,
} from '@cart/shared';

type SelectionsInput = {
  selections: CartSelection[];
};

export const getBaseSelections = (input: SelectionsInput) => {
  const baseSelections = input.selections.filter(
    (selection) => selection.recipe_type === 'base',
  );

  if (baseSelections.length !== input.selections.length) {
    throw new BadRequestException(
      'Variant recipes are not supported yet in cart creation',
    );
  }

  return baseSelections;
};

export const buildDishesFromSelections = (
  recipes: BaseRecipe[],
  input: SelectionsInput,
): Dish[] => {
  const baseSelections = getBaseSelections(input);
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const dishes: Dish[] = [];

  for (const selection of baseSelections) {
    const recipe = recipesById.get(selection.recipe_id);

    if (!recipe) {
      throw new BadRequestException(
        `Recipe ${selection.recipe_id} is not available to this user`,
      );
    }

    const scaledServings = selection.servings_override ?? recipe.servings;

    for (let index = 0; index < selection.quantity; index += 1) {
      dishes.push(toDish(recipe, scaledServings));
    }
  }

  return dishes;
};

export const buildShoppingCartResponse = (input: {
  cartId: string;
  overview: ShoppingCart['overview'];
  matchedItems: ShoppingCart['matched_items'];
  estimatedSubtotal: number;
  retailer: ShoppingCart['retailer'];
}): Omit<
  ShoppingCart,
  'id' | 'user_id' | 'created_at' | 'updated_at'
> => ({
  cart_id: input.cartId,
  overview: input.overview,
  matched_items: input.matchedItems,
  estimated_subtotal: input.estimatedSubtotal,
  retailer: input.retailer,
});

export const cloneCartSelections = (cart: Cart): CartSelection[] =>
  cart.selections.map((selection) => ({ ...selection }));

const toDish = (recipe: BaseRecipe, servings: number): Dish => {
  const scaleFactor = servings / recipe.servings;

  return {
    id: recipe.id,
    name: recipe.name,
    cuisine: recipe.cuisine.label,
    servings,
    tags: recipe.tags.map((tag) => tag.name),
    steps: recipe.steps,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      amount: ingredient.amount * scaleFactor,
    })),
  };
};
