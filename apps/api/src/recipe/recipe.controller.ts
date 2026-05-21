import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import type { HomeRecipeRecommendations, RecipeListPage } from '@cart/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  OptionalRequestActorGuard,
  RequestActorGuard,
} from '../auth/request-actor.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiCreateRecipe,
  ApiDeleteRecipe,
  ApiGetRecipe,
  ApiGetRecipeOrigin,
  ApiGetHomeRecipeRecommendations,
  ApiListRecipes,
  ApiRecipeController,
  ApiUpdateRecipe,
} from './recipe.swagger';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeService } from './recipe.service';

@ApiRecipeController()
@Controller('api/v1/recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  @UseGuards(RequestActorGuard)
  @ApiCreateRecipe()
  create(
    @Body() input: CreateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaseRecipe> {
    return this.recipeService.create(input, user.sub);
  }

  @Get()
  @UseGuards(OptionalRequestActorGuard)
  @ApiListRecipes()
  findAll(
    @Query() query: ListRecipesQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BaseRecipe[] | RecipeListPage> {
    if (query.limit !== undefined || query.cursor) {
      return this.recipeService.findPage(
        { limit: query.limit ?? 24, cursor: query.cursor },
        user?.sub,
      );
    }

    return this.recipeService.findAll(user?.sub);
  }

  @Get('recommendations/home')
  @UseGuards(RequestActorGuard)
  @ApiGetHomeRecipeRecommendations()
  findHomeRecommendations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HomeRecipeRecommendations> {
    return this.recipeService.findHomeRecommendations(user.sub);
  }

  @Get(':id/origin')
  @UseGuards(OptionalRequestActorGuard)
  @ApiGetRecipeOrigin()
  findOrigin(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BaseRecipe> {
    return this.recipeService.findOrigin(id, user?.sub);
  }

  @Get(':id')
  @UseGuards(OptionalRequestActorGuard)
  @ApiGetRecipe()
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BaseRecipe> {
    return this.recipeService.findOne(id, user?.sub);
  }

  @Patch(':id')
  @UseGuards(RequestActorGuard)
  @ApiUpdateRecipe()
  update(
    @Param('id') id: string,
    @Body() input: UpdateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaseRecipe> {
    return this.recipeService.update(id, input, user.sub);
  }

  @Delete(':id')
  @UseGuards(RequestActorGuard)
  @HttpCode(204)
  @ApiDeleteRecipe()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.recipeService.remove(id, user.sub);
  }
}
