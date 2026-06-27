import type {
  BaseRecipe as PrismaBaseRecipe,
  Cuisine as PrismaCuisine,
  DishIngredient as PrismaDishIngredient,
  RecipeMealType as PrismaRecipeMealType,
  RecipePlanningProfile as PrismaRecipePlanningProfile,
  RecipeProvenanceProfile as PrismaRecipeProvenanceProfile,
  RecipeTag as PrismaRecipeTag,
  RecipeStep as PrismaRecipeStep,
  Tag as PrismaTag,
} from '../../generated/prisma/index.js';

export type BaseRecipeWithRelations = PrismaBaseRecipe & {
  cuisine: PrismaCuisine;
  ingredients: PrismaDishIngredient[];
  planningProfile: PrismaRecipePlanningProfile | null;
  mealTypes: PrismaRecipeMealType[];
  provenanceProfile: PrismaRecipeProvenanceProfile | null;
  recipeTags: Array<
    PrismaRecipeTag & {
      tag: PrismaTag;
    }
  >;
  steps: PrismaRecipeStep[];
};
