import type {
  DishIngredient,
  RecipeCostTier,
  RecipeDifficulty,
  RecipeMealType,
  RecipeNutritionData,
  RecipeStep,
} from "./recipe";

export type CaptureInputKind = "url" | "text" | "image";

export type CaptureSourceKind =
  | "recipe_url"
  | "social_url"
  | "pasted_text"
  | "image"
  | "unknown";

export type CaptureResultKind =
  | "exact_recipe_import"
  | "partial_recipe_import"
  | "reconstructed_recipe"
  | "inspired_recipe";

export type CaptureStatus =
  | "processing"
  | "ready_for_review"
  | "needs_more_info"
  | "failed"
  | "saved"
  | "discarded";

export type CaptureConfidence = "low" | "medium" | "high";

export type CaptureSourceAttribution = {
  url?: string;
  title?: string;
  creator?: string;
  site?: string;
  platform?: "youtube" | "instagram" | "tiktok" | "generic" | "chef";
  attribution_label: string;
};

export type CaptureRecipePreview = {
  name: string;
  cuisine: string;
  description: string;
  cover_image_url?: string;
  servings: number;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
  tags: string[];
  nutrition_estimate?: RecipeNutritionData | null;
  meal_types?: RecipeMealType[];
  difficulty?: RecipeDifficulty;
  difficulty_reason?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  estimated_cost_tier?: RecipeCostTier;
  cost_notes: string[];
  quality_tradeoffs: string[];
  assumptions: string[];
};

export type Capture = {
  id: string;
  user_id: string;
  input_kind: CaptureInputKind;
  source_kind: CaptureSourceKind;
  result_kind: CaptureResultKind;
  status: CaptureStatus;
  confidence: CaptureConfidence;
  needs_review: boolean;
  saved_recipe_id?: string;
  source_url?: string;
  source_text_snippet?: string;
  source_attribution: CaptureSourceAttribution;
  recipe_preview?: CaptureRecipePreview;
  assumptions: string[];
  missing_info: string[];
  next_actions: string[];
  extraction_notes: string[];
  short_snippets: string[];
  error_message?: string;
  created_at: string;
  updated_at: string;
};

export type CreateCaptureRequest = {
  input_kind?: CaptureInputKind;
  url?: string;
  text?: string;
  image_data_url?: string;
};
