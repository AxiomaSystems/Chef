import { Prisma } from '../../generated/prisma/index.js';
import type { CreateRecipeDto } from './dto/create-recipe.dto';
import type { UpdateRecipeDto } from './dto/update-recipe.dto';

const mapIngredientCreateInput = (
  ingredient: CreateRecipeDto['ingredients'][number],
  index: number,
) => ({
  canonicalIngredient: ingredient.canonical_ingredient,
  amount: ingredient.amount,
  unit: ingredient.unit,
  displayIngredient: ingredient.display_ingredient,
  preparation: ingredient.preparation,
  optional: ingredient.optional ?? false,
  ingredientGroup: ingredient.group,
  sortOrder: index,
});

const mapStepCreateInput = (step: CreateRecipeDto['steps'][number]) => ({
  stepNumber: step.step,
  whatToDo: step.what_to_do,
});

export const buildCreateRecipeData = (
  input: CreateRecipeDto,
  ownerUserId: string,
): Prisma.BaseRecipeUncheckedCreateInput => ({
  ownerUserId,
  isSystemRecipe: false,
  name: input.name,
  cuisineId: input.cuisine_id,
  description: input.description,
  coverImageUrl: input.cover_image_url,
  ...(input.nutrition_data
    ? {
        nutritionData: {
          ...input.nutrition_data,
        } as Prisma.InputJsonValue,
      }
    : {}),
  servings: input.servings,
  ingredients: {
    create: input.ingredients.map(mapIngredientCreateInput),
  },
  steps: {
    create: input.steps.map(mapStepCreateInput),
  },
});

export const buildUpdateRecipeData = (
  input: UpdateRecipeDto,
): Prisma.BaseRecipeUncheckedUpdateInput => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.cuisine_id !== undefined ? { cuisineId: input.cuisine_id } : {}),
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...('cover_image_url' in input
    ? {
        coverImageUrl: input.cover_image_url ?? null,
      }
    : {}),
  ...('nutrition_data' in input
    ? {
        nutritionData: input.nutrition_data
          ? ({ ...input.nutrition_data } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      }
    : {}),
  ...(input.servings !== undefined ? { servings: input.servings } : {}),
  ...(input.ingredients
    ? {
        ingredients: {
          deleteMany: {},
          create: input.ingredients.map(mapIngredientCreateInput),
        },
      }
    : {}),
  ...(input.steps
    ? {
        steps: {
          deleteMany: {},
          create: input.steps.map(mapStepCreateInput),
        },
      }
    : {}),
});

export const buildVisibleRecipeWhere = (actorId?: string) =>
  actorId
    ? {
        OR: [{ isSystemRecipe: true }, { ownerUserId: actorId }],
      }
    : {
        isSystemRecipe: true,
        ownerUserId: null,
      };

export const buildOwnedMutableRecipeWhere = (id: string, actorId: string) => ({
  id,
  ownerUserId: actorId,
  isSystemRecipe: false,
});
