import { Injectable } from '@nestjs/common';
import type { AiProvider } from './ai.provider';
import type { AiChatResult, AiIngredientSwapResult, AiMealGenerationResult } from './ai.types';
import type { AiChatDto } from './dto/chat.dto';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { SwapIngredientDto } from './dto/swap-ingredient.dto';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiAiProvider } from './providers/openai-ai.provider';

@Injectable()
export class AiService {
  constructor(
    private readonly mockProvider: MockAiProvider,
    private readonly openAiProvider: OpenAiAiProvider,
  ) {}

  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult> {
    return this.provider.generateMeals({
      ...input,
      servings_per_meal: input.servings_per_meal ?? 4,
      meals_needed: input.meals_needed ?? 1,
      dietary_preferences: input.dietary_preferences ?? [],
      allergies: input.allergies ?? [],
      disliked_ingredients: input.disliked_ingredients ?? [],
      inventory: input.inventory ?? [],
      budget_mode: input.budget_mode ?? 'balanced',
      meal_style: input.meal_style ?? 'standard',
      quality_goals: input.quality_goals ?? [],
      notes: input.notes ?? '',
    });
  }

  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult> {
    return this.provider.swapIngredient({
      ...input,
      dietary_preferences: input.dietary_preferences ?? [],
      inventory: input.inventory ?? [],
      budget_mode: input.budget_mode ?? 'balanced',
      notes: input.notes ?? '',
    });
  }

  chat(input: AiChatDto): Promise<AiChatResult> {
    return this.provider.chat({
      message: input.message,
      history: input.history ?? [],
      context: input.context,
    });
  }

  getProviderName() {
    return this.provider.name;
  }

  private get provider(): AiProvider {
    const requestedProvider = (process.env.CHEF_LLM_PROVIDER ?? 'mock').toLowerCase();

    if (requestedProvider === 'openai') {
      return this.openAiProvider;
    }

    return this.mockProvider;
  }
}

