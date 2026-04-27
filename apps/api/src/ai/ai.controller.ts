import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { AiService } from './ai.service';
import type {
  AiChatResult,
  AiIngredientSwapResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
} from './ai.types';
import { AiChatDto } from './dto/chat.dto';
import { GenerateMealsDto } from './dto/generate-meals.dto';
import { ImportRecipeDto } from './dto/import-recipe.dto';
import { SwapIngredientDto } from './dto/swap-ingredient.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(RequestActorGuard)
@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOkResponse({ description: 'Returns the active AI provider.' })
  status() {
    return {
      provider: this.aiService.getProviderName(),
    };
  }

  @Post('meals/generate')
  @ApiOkResponse({ description: 'Generates structured recipe previews.' })
  generateMeals(
    @Body() input: GenerateMealsDto,
  ): Promise<AiMealGenerationResult> {
    return this.aiService.generateMeals(input);
  }

  @Post('recipes/swap-ingredient')
  @ApiOkResponse({
    description: 'Proposes and returns a structured ingredient swap.',
  })
  swapIngredient(
    @Body() input: SwapIngredientDto,
  ): Promise<AiIngredientSwapResult> {
    return this.aiService.swapIngredient(input);
  }

  @Post('recipe-imports/structure')
  @ApiOkResponse({
    description:
      'Imports a creator or recipe URL into a structured recipe preview.',
  })
  importRecipe(@Body() input: ImportRecipeDto): Promise<AiRecipeImportResult> {
    return this.aiService.importRecipe(input);
  }

  @Post('chat')
  @ApiOkResponse({
    description: 'Answers a contextual Chef assistant chat prompt.',
  })
  chat(@Body() input: AiChatDto): Promise<AiChatResult> {
    return this.aiService.chat(input);
  }
}
