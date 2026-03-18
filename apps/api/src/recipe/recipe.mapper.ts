import type { BaseRecipe, DishIngredient, RecipeStep } from '@cart/shared';
import type {
  BaseRecipe as PrismaBaseRecipe,
  DishIngredient as PrismaDishIngredient,
  RecipeStep as PrismaRecipeStep,
} from '../../generated/prisma/index.js';

type BaseRecipeWithRelations = PrismaBaseRecipe & {
  ingredients: PrismaDishIngredient[];
  steps: PrismaRecipeStep[];
};

const mapIngredient = (ingredient: PrismaDishIngredient): DishIngredient => ({
  canonical_ingredient: ingredient.canonicalIngredient,
  amount: ingredient.amount,
  unit: ingredient.unit,
  display_ingredient: ingredient.displayIngredient ?? undefined,
  preparation: ingredient.preparation ?? undefined,
  optional: ingredient.optional || undefined,
  group: ingredient.ingredientGroup ?? undefined,
});

const mapStep = (step: PrismaRecipeStep): RecipeStep => ({
  step: step.stepNumber,
  what_to_do: step.whatToDo,
});

export const mapBaseRecipe = (
  recipe: BaseRecipeWithRelations,
): BaseRecipe => ({
  id: recipe.id,
  user_id: recipe.userId ?? undefined,
  name: recipe.name,
  cuisine: recipe.cuisine ?? undefined,
  description: recipe.description ?? undefined,
  servings: recipe.servings,
  ingredients: recipe.ingredients
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(mapIngredient),
  steps: recipe.steps
    .slice()
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map(mapStep),
  tags: recipe.tags,
  created_at: recipe.createdAt.toISOString(),
  updated_at: recipe.updatedAt.toISOString(),
});
