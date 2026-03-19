import { mapCuisine } from '../cuisines/cuisines.mapper';
import { mapTag } from '../tags/tags.mapper';
import type { BaseRecipe, DishIngredient, RecipeStep } from '@cart/shared';
import type {
  DishIngredient as PrismaDishIngredient,
  RecipeStep as PrismaRecipeStep,
} from '../../generated/prisma/index.js';
import type { BaseRecipeWithRelations } from './recipe.persistence.types';

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
  owner_user_id: recipe.ownerUserId ?? undefined,
  forked_from_recipe_id: recipe.forkedFromRecipeId ?? undefined,
  is_system_recipe: recipe.isSystemRecipe,
  name: recipe.name,
  cuisine_id: recipe.cuisineId,
  cuisine: mapCuisine(recipe.cuisine),
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
  tag_ids: (recipe.recipeTags ?? [])
    .slice()
    .sort((left, right) => left.tag.name.localeCompare(right.tag.name))
    .map((recipeTag) => recipeTag.tag.id),
  tags: (recipe.recipeTags ?? [])
    .slice()
    .sort((left, right) => left.tag.name.localeCompare(right.tag.name))
    .map((recipeTag) => mapTag(recipeTag.tag)),
  created_at: recipe.createdAt.toISOString(),
  updated_at: recipe.updatedAt.toISOString(),
});
