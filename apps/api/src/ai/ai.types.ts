import type { RecipeNutritionData } from '@cart/shared';

export type AiProviderName = 'mock' | 'openai';

export type AiDishIngredient = {
  canonical_ingredient: string;
  amount: number;
  unit: string;
  display_ingredient: string | null;
  preparation: string | null;
  optional: boolean;
  group: string | null;
};

export type AiRecipeStep = {
  step: number;
  what_to_do: string;
};

export type AiRecipePreview = {
  name: string;
  cuisine: string;
  description: string;
  servings: number;
  ingredients: AiDishIngredient[];
  steps: AiRecipeStep[];
  tags: string[];
  nutrition_estimate: RecipeNutritionData | null;
  estimated_cost_tier: 'low' | 'medium' | 'high';
  cost_notes: string[];
  quality_tradeoffs: string[];
  assumptions: string[];
};

export type AiMealGenerationResult = {
  summary: string;
  recipes: AiRecipePreview[];
  inventory_used: string[];
  cost_minimization_notes: string[];
  planning_notes: string[];
};

export type AiIngredientSwapResult = {
  confirmation_message: string;
  original_ingredient: string;
  replacement_ingredient: string;
  should_apply: boolean;
  downsides: string[];
  benefits: string[];
  updated_recipe: AiRecipePreview;
  ingredient_delta_notes: string[];
};

export type AiChatResult = {
  message: string;
  follow_up_prompts: string[];
  safety_notes: string[];
};

export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiRecipeImportPlatform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'generic';

export type AiRecipeImportResult = {
  source_url: string;
  platform: AiRecipeImportPlatform;
  source_title: string;
  source_creator: string | null;
  source_description: string;
  imported_recipe: AiRecipePreview;
  extraction_notes: string[];
};
