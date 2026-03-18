import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeService } from './recipe.service';

@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  create(@Body() input: CreateRecipeDto): Promise<BaseRecipe> {
    return this.recipeService.create(input);
  }

  @Get()
  findAll(): Promise<BaseRecipe[]> {
    return this.recipeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BaseRecipe> {
    return this.recipeService.findOne(id);
  }
}
