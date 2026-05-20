import type {
  AiChatMessage,
  AiChatResult,
  AiIngredientSwapResult,
  AiInventoryAlternativesResult,
  AiInventoryStructureResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
} from './ai.types';
import type { InventoryAlternativesDto } from './dto/inventory-alternatives.dto';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { ImportRecipeDto } from './dto/import-recipe.dto';
import type { SwapIngredientDto } from './dto/swap-ingredient.dto';
import type { StructureInventoryDto } from './dto/structure-inventory.dto';

export interface AiProvider {
  readonly name: string;
  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult>;
  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult>;
  suggestInventoryAlternatives(
    input: InventoryAlternativesDto,
  ): Promise<AiInventoryAlternativesResult>;
  importRecipe(input: {
    request: ImportRecipeDto | { url: string; supplemental_text?: string };
    platform: 'youtube' | 'instagram' | 'tiktok' | 'generic';
    source_title: string;
    source_creator: string | null;
    source_description: string;
    source_image_url: string | null;
    extracted_text: string;
    extraction_notes: string[];
    image_data_url?: string;
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
