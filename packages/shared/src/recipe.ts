import type { Cuisine } from './cuisine';
import type { Tag } from './tag';

export type RecipeNutritionData = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};

export type RecipeStep = {
  step: number;
  what_to_do: string;
};

export type DishIngredient = {
  canonical_ingredient: string;
  amount: number;
  unit: string;
  display_ingredient?: string;
  preparation?: string;
  optional?: boolean;
  group?: string;
};

export type Dish = {
  id?: string;
  name: string;
  cuisine?: string;
  servings?: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
};

export type BaseRecipe = {
  id: string;
  owner_user_id?: string;
  forked_from_recipe_id?: string;
  is_system_recipe: boolean;
  name: string;
  cuisine_id: string;
  cuisine: Cuisine;
  description?: string;
  cover_image_url?: string;
  nutrition_data?: RecipeNutritionData;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tag_ids: string[];
  tags: Tag[];
  created_at: string;
  updated_at: string;
};

export type RecipeTransformationType =
  | "halal"
  | "vegan"
  | "cheaper"
  | "calorie_adjusted"
  | "custom";

export type RecipeVariant = {
  id: string;
  base_recipe_id: string;
  name: string;
  transformation_type: RecipeTransformationType;
  transformation_prompt?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags?: string[];
  created_at: string;
};

export type RecipeAdaptationRequest = {
  base_recipe_id: string;
  target_constraints: {
    halal?: boolean;
    vegan?: boolean;
    vegetarian?: boolean;
    calorie_range?: {
      min?: number;
      max?: number;
    };
    max_cost?: number;
    custom_notes?: string;
  };
};
