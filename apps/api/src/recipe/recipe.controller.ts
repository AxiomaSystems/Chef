import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import {
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeService } from './recipe.service';

@ApiTags('recipes')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Optional dev-only actor override header.',
})
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user-owned recipe' })
  @ApiOkResponse({ description: 'Created recipe' })
  create(
    @Body() input: CreateRecipeDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.create(input, actorUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List visible recipes for the current user' })
  @ApiOkResponse({ description: 'Visible recipes' })
  findAll(@Headers('x-user-id') actorUserId?: string): Promise<BaseRecipe[]> {
    return this.recipeService.findAll(actorUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single visible recipe by id' })
  @ApiOkResponse({ description: 'Recipe details' })
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.findOne(id, actorUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user-owned non-system recipe' })
  @ApiOkResponse({ description: 'Updated recipe' })
  update(
    @Param('id') id: string,
    @Body() input: UpdateRecipeDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.update(id, input, actorUserId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user-owned non-system recipe' })
  @ApiNoContentResponse({ description: 'Recipe deleted' })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<void> {
    await this.recipeService.remove(id, actorUserId);
  }
}
