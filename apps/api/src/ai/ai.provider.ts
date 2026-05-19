import type {
  AiChatMessage,
  AiChatResult,
  AiIngredientSwapResult,
  AiInventoryStructureResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
} from './ai.types';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { ImportRecipeDto } from './dto/import-recipe.dto';
import type { SwapIngredientDto } from './dto/swap-ingredient.dto';
import type { StructureInventoryDto } from './dto/structure-inventory.dto';

export interface AiProvider {
  readonly name: string;
  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult>;
  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult>;
  importRecipe(input: {
    request: ImportRecipeDto;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'generic';
    source_title: string;
    source_creator: string | null;
    source_description: string;
    source_image_url: string | null;
    extracted_text: string;
    extraction_notes: string[];
  }): Promise<AiRecipeImportResult>;
  chat(input: {
    message: string;
    history: AiChatMessage[];
    context?: Record<string, unknown>;
  }): Promise<AiChatResult>;
  structureInventory(
    input: StructureInventoryDto,
  ): Promise<AiInventoryStructureResult>;
}
