import { Injectable, NotFoundException } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeRepository } from './recipe.repository';

@Injectable()
export class RecipeService {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  create(input: CreateRecipeDto, actorUserId?: string): Promise<BaseRecipe> {
    return this.recipeRepository.create(input, actorUserId);
  }

  findAll(actorUserId?: string): Promise<BaseRecipe[]> {
    return this.recipeRepository.findMany(actorUserId);
  }

  async findOne(id: string, actorUserId?: string): Promise<BaseRecipe> {
    const recipe = await this.recipeRepository.findById(id, actorUserId);

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }

    return recipe;
  }
}
