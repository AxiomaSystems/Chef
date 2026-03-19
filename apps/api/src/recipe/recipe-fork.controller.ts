import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { ApiProperty } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsString } from 'class-validator';
import { ApiCreateRecipeFork, ApiRecipeForkController } from './recipe.swagger';
import { RecipeService } from './recipe.service';

class CreateRecipeForkDto {
  @ApiProperty({ example: 'recipe-system-1' })
  @IsString()
  source_recipe_id!: string;
}

@ApiRecipeForkController()
@Controller('api/v1/recipe-forks')
export class RecipeForkController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  @ApiCreateRecipeFork()
  async createFork(
    @Body() input: CreateRecipeForkDto,
    @Headers('x-user-id') actorUserId: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BaseRecipe> {
    const result = await this.recipeService.save(input.source_recipe_id, actorUserId);
    response.status(result.created ? 201 : 200);
    return result.recipe;
  }
}
