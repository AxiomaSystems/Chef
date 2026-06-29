import { Prisma } from '../../generated/prisma/index.js';
import type {
  CreateRecipeDto,
  RecipePlanningInputDto,
} from './dto/create-recipe.dto';
import type { UpdateRecipeDto } from './dto/update-recipe.dto';

const mapIngredientCreateInput = (
  ingredient: CreateRecipeDto['ingredients'][number],
  index: number,
  ingredientIdsByIndex?: Array<string | undefined>,
) => ({
  ...(ingredientIdsByIndex?.[index]
    ? { ingredientId: ingredientIdsByIndex[index] }
    : {}),
  canonicalIngredient: ingredient.canonical_ingredient,
  amount: ingredient.amount,
  unit: ingredient.unit,
  amountText: normalizeOptionalString(ingredient.amount_text),
  displayIngredient: ingredient.display_ingredient,
  preparation: ingredient.preparation,
  substitutions: normalizeStringArray(ingredient.substitutions, 10).slice(
    0,
    10,
  ) as Prisma.InputJsonValue,
  optional: ingredient.optional ?? false,
  ingredientGroup: ingredient.group,
  sortOrder: index,
});

const mapStepCreateInput = (step: CreateRecipeDto['steps'][number]) => ({
  stepNumber: step.step,
  whatToDo: step.what_to_do,
  durationMinutes: step.duration_minutes,
  temperature: step.temperature,
  temperatureUnit: step.temperature_unit,
  timerLabel: normalizeOptionalString(step.timer_label),
  equipment: normalizeStringArray(step.equipment, 10) as Prisma.InputJsonValue,
});

const normalizeOptionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeStringArray = (values?: string[], maxItems = 6) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, maxItems),
    ),
  );

const uniqueMealTypes = (mealTypes?: RecipePlanningInputDto['meal_types']) =>
  Array.from(new Set(mealTypes ?? []));

const mapPlanningProfileData = (
  planning: RecipePlanningInputDto,
): Prisma.RecipePlanningProfileUncheckedCreateWithoutRecipeInput => ({
  difficulty: planning.difficulty,
  difficultyReason: planning.difficulty_reason,
  prepTimeMinutes: planning.prep_time_minutes,
  cookTimeMinutes: planning.cook_time_minutes,
  totalTimeMinutes: planning.total_time_minutes,
  estimatedCostTier: planning.estimated_cost_tier,
  costNotes: normalizeStringArray(planning.cost_notes) as Prisma.InputJsonValue,
});

export const buildCreateRecipeData = (
  input: CreateRecipeDto,
  ownerUserId: string,
  ingredientIdsByIndex?: Array<string | undefined>,
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
  ...(input.planning
    ? {
        planningProfile: {
          create: mapPlanningProfileData(input.planning),
        },
        mealTypes: {
          create: uniqueMealTypes(input.planning.meal_types).map(
            (mealType) => ({
              mealType,
            }),
          ),
        },
      }
    : {}),
  ingredients: {
    create: input.ingredients.map((ingredient, index) =>
      mapIngredientCreateInput(ingredient, index, ingredientIdsByIndex),
    ),
  },
  steps: {
    create: input.steps.map(mapStepCreateInput),
  },
});

export const buildUpdateRecipeData = (
  input: UpdateRecipeDto,
  ingredientIdsByIndex?: Array<string | undefined>,
): Prisma.BaseRecipeUncheckedUpdateInput => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.cuisine_id !== undefined ? { cuisineId: input.cuisine_id } : {}),
  ...(input.description !== undefined
    ? { description: input.description }
    : {}),
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
  ...('planning' in input
    ? input.planning === null
      ? {
          planningProfile: {
            delete: true,
          },
          mealTypes: {
            deleteMany: {},
          },
        }
      : input.planning
        ? {
            planningProfile: {
              upsert: {
                create: mapPlanningProfileData(input.planning),
                update: mapPlanningProfileData(input.planning),
              },
            },
            mealTypes: {
              deleteMany: {},
              create: uniqueMealTypes(input.planning.meal_types).map(
                (mealType) => ({
                  mealType,
                }),
              ),
            },
          }
        : {}
    : {}),
  ...(input.ingredients
    ? {
        ingredients: {
          deleteMany: {},
          create: input.ingredients.map((ingredient, index) =>
            mapIngredientCreateInput(ingredient, index, ingredientIdsByIndex),
          ),
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
