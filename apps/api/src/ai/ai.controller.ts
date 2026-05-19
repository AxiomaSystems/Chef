import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AiLimitsStatus } from '@cart/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { AiLimitsStatusResponseDto } from '../common/http/swagger.dto';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimitService } from './ai-rate-limit.service';
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

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(RequestActorGuard)
@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiRateLimitService: AiRateLimitService,
  ) {}

  @Get('status')
  @ApiOkResponse({ description: 'Returns the active AI provider.' })
  status() {
    return {
      provider: this.aiService.getProviderName(),
    };
  }

  @Get('limits')
  @ApiOkResponse({
    description:
      'Returns AI provider and rate limit usage for the current user.',
    type: AiLimitsStatusResponseDto,
  })
  limits(@Req() request: RequestWithUser): AiLimitsStatus {
    const provider = this.aiService.getProviderName();

    return {
      provider,
      model:
        provider === 'openai'
          ? (process.env.OPENAI_MODEL ?? 'gpt-5.4-mini')
          : null,
      openai_configured: Boolean(process.env.OPENAI_API_KEY),
      rate_limit: this.aiRateLimitService.getSnapshot(request),
    };
  }

  @Post('meals/generate')
  @UseGuards(AiRateLimitGuard)
  @ApiOkResponse({ description: 'Generates structured recipe previews.' })
  generateMeals(
    @Body() input: GenerateMealsDto,
  ): Promise<AiMealGenerationResult> {
    return this.aiService.generateMeals(input);
  }

  @Post('recipes/swap-ingredient')
  @UseGuards(AiRateLimitGuard)
  @ApiOkResponse({
    description: 'Proposes and returns a structured ingredient swap.',
  })
  swapIngredient(
    @Body() input: SwapIngredientDto,
  ): Promise<AiIngredientSwapResult> {
    return this.aiService.swapIngredient(input);
  }

  @Post('recipe-imports/structure')
  @UseGuards(AiRateLimitGuard)
  @ApiOkResponse({
    description:
      'Imports a creator or recipe URL into a structured recipe preview.',
  })
  importRecipe(@Body() input: ImportRecipeDto): Promise<AiRecipeImportResult> {
    return this.aiService.importRecipe(input);
  }

  @Post('chat')
  @UseGuards(AiRateLimitGuard)
  @ApiOkResponse({
    description: 'Answers a contextual Chef assistant chat prompt.',
  })
  chat(@Body() input: AiChatDto): Promise<AiChatResult> {
    return this.aiService.chat(input);
  }
}
