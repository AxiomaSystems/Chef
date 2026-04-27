import type {
  AiChatMessage,
  AiChatResult,
  AiIngredientSwapResult,
  AiMealGenerationResult,
} from './ai.types';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { SwapIngredientDto } from './dto/swap-ingredient.dto';

export interface AiProvider {
  readonly name: string;
  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult>;
  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult>;
  chat(input: {
    message: string;
    history: AiChatMessage[];
    context?: Record<string, unknown>;
  }): Promise<AiChatResult>;
}

