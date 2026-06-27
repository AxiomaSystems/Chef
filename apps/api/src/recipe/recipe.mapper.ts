import { mapCuisine } from '../cuisines/cuisines.mapper';
import { mapTag } from '../tags/tags.mapper';
import type {
  BaseRecipe,
  DishIngredient,
  RecipeCostTier,
  RecipeDifficulty,
  RecipeExtractionConfidence,
  RecipeMealType,
  RecipeReviewStatus,
  RecipeSourceType,
  RecipeStep,
} from '@cart/shared';
import type {
  DishIngredient as PrismaDishIngredient,
  RecipeMealType as PrismaRecipeMealType,
  RecipePlanningProfile as PrismaRecipePlanningProfile,
  RecipeProvenanceProfile as PrismaRecipeProvenanceProfile,
  RecipeStep as PrismaRecipeStep,
} from '../../generated/prisma/index.js';
import type { BaseRecipeWithRelations } from './recipe.persistence.types';

const MEAL_TYPE_ORDER: RecipeMealType[] = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'side',
  'appetizer',
  'drink',
];

const mapIngredient = (ingredient: PrismaDishIngredient): DishIngredient => ({
  ingredient_id: ingredient.ingredientId ?? undefined,
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

const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const effectiveTotalTimeMinutes = (
  profile: PrismaRecipePlanningProfile,
): number | undefined => {
  if (profile.totalTimeMinutes !== null) return profile.totalTimeMinutes;
  if (profile.prepTimeMinutes === null || profile.cookTimeMinutes === null) {
    return undefined;
  }

  return profile.prepTimeMinutes + profile.cookTimeMinutes;
};

const mapPlanningProfile = (
  profile: PrismaRecipePlanningProfile | null,
  mealTypes: PrismaRecipeMealType[],
): BaseRecipe['planning'] => {
  if (!profile && mealTypes.length === 0) return undefined;

  const sortedMealTypes = mealTypes
    .map((entry) => entry.mealType as RecipeMealType)
    .sort((left, right) => {
      return MEAL_TYPE_ORDER.indexOf(left) - MEAL_TYPE_ORDER.indexOf(right);
    });

  return {
    meal_types: sortedMealTypes,
    difficulty: (profile?.difficulty as RecipeDifficulty | null) ?? undefined,
    difficulty_reason: profile?.difficultyReason ?? undefined,
    prep_time_minutes: profile?.prepTimeMinutes ?? undefined,
    cook_time_minutes: profile?.cookTimeMinutes ?? undefined,
    total_time_minutes: profile
      ? effectiveTotalTimeMinutes(profile)
      : undefined,
    estimated_cost_tier:
      (profile?.estimatedCostTier as RecipeCostTier | null) ?? undefined,
    cost_notes: jsonStringArray(profile?.costNotes),
  };
};

const mapProvenanceProfile = (
  profile: PrismaRecipeProvenanceProfile | null,
): BaseRecipe['provenance'] => {
  if (!profile) return undefined;

  return {
    source_type: profile.sourceType as RecipeSourceType,
    source_url: profile.sourceUrl ?? undefined,
    source_name: profile.sourceName ?? undefined,
    attribution_label: profile.attributionLabel ?? undefined,
    review_status: profile.reviewStatus as RecipeReviewStatus,
    extraction_confidence:
      (profile.extractionConfidence as RecipeExtractionConfidence | null) ??
      undefined,
  };
};

export const mapBaseRecipe = (recipe: BaseRecipeWithRelations): BaseRecipe => ({
  id: recipe.id,
  owner_user_id: recipe.ownerUserId ?? undefined,
  forked_from_recipe_id: recipe.forkedFromRecipeId ?? undefined,
  is_system_recipe: recipe.isSystemRecipe,
  name: recipe.name,
  cuisine_id: recipe.cuisineId,
  cuisine: mapCuisine(recipe.cuisine),
  description: recipe.description ?? undefined,
  cover_image_url: recipe.coverImageUrl ?? undefined,
  nutrition_data:
    (recipe.nutritionData as BaseRecipe['nutrition_data']) ?? undefined,
  servings: recipe.servings,
  planning: mapPlanningProfile(recipe.planningProfile, recipe.mealTypes ?? []),
  provenance: mapProvenanceProfile(recipe.provenanceProfile),
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
