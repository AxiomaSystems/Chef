import type { Cuisine } from "./cuisine";
import type { Tag } from "./tag";

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
  step_id?: string;
  step: number;
  what_to_do: string;
  duration_minutes?: number;
  temperature?: number;
  temperature_unit?: "F" | "C";
  timer_label?: string;
  equipment?: string[];
  ingredient_ids?: string[];
  ingredient_client_line_ids?: string[];
};

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type RecipeCostTier = "low" | "medium" | "high";

export type RecipeMealType =
  | "breakfast"
  | "brunch"
  | "lunch"
  | "dinner"
  | "snack"
  | "dessert"
  | "side"
  | "appetizer"
  | "drink";

export type RecipeSourceType =
  | "user_created"
  | "ai_generated"
  | "recipe_url"
  | "social_url"
  | "pasted_text"
  | "image"
  | "unknown";

export type RecipeReviewStatus =
  | "draft"
  | "needs_review"
  | "reviewed"
  | "trusted";

export type RecipeExtractionConfidence = "low" | "medium" | "high";

export type RecipePlanningProfile = {
  meal_types: RecipeMealType[];
  difficulty?: RecipeDifficulty;
  difficulty_reason?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  estimated_cost_tier?: RecipeCostTier;
  cost_notes: string[];
};

export type RecipeProvenanceProfile = {
  source_type: RecipeSourceType;
  source_url?: string;
  source_name?: string;
  attribution_label?: string;
  review_status: RecipeReviewStatus;
  extraction_confidence?: RecipeExtractionConfidence;
};

export type DishIngredient = {
  recipe_ingredient_id?: string;
  client_line_id?: string;
  ingredient_id?: string;
  canonical_ingredient: string;
  amount?: number;
  unit?: string;
  amount_text?: string;
  display_ingredient?: string;
  preparation?: string;
  substitutions?: string[];
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
  planning?: RecipePlanningProfile;
  provenance?: RecipeProvenanceProfile;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tag_ids: string[];
  tags: Tag[];
  dietary_restrictions?: string;
  created_at: string;
  updated_at: string;
};

export type RecipeListPage = {
  items: BaseRecipe[];
  next_cursor?: string;
  metadata?: {
    saved_source_ids: string[];
    counts: {
      public: number;
      mine: number;
      saved: number;
    };
  };
};

export type HomeRecipeRecommendation = {
  recipe: BaseRecipe;
  reason: string;
  score: number;
};

export type HomeRecipeRecommendations = {
  hero: BaseRecipe | null;
  picked_for_you: HomeRecipeRecommendation[];
  trending: BaseRecipe[];
  more_to_cook: BaseRecipe[];
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
