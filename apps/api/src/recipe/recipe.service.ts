import { Injectable, NotFoundException } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  assertMutableRecipeResult,
  assertVisibleRecipe,
} from './recipe.errors';
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

  async findOrigin(id: string, actorUserId?: string): Promise<BaseRecipe> {
    const recipe = await assertVisibleRecipe(
      await this.recipeRepository.findById(id, actorUserId),
      id,
    );

    if (!recipe.forked_from_recipe_id) {
      throw new NotFoundException(`Recipe ${id} does not have an origin recipe`);
    }

    return assertVisibleRecipe(
      await this.recipeRepository.findById(
        recipe.forked_from_recipe_id,
        actorUserId,
      ),
      recipe.forked_from_recipe_id,
    );
  }

  findManyByIds(ids: string[], actorUserId?: string): Promise<BaseRecipe[]> {
    return this.recipeRepository.findManyByIds(ids, actorUserId);
  }

  async findOne(id: string, actorUserId?: string): Promise<BaseRecipe> {
    return assertVisibleRecipe(
      await this.recipeRepository.findById(id, actorUserId),
      id,
    );
  }

  async update(
    id: string,
    input: UpdateRecipeDto,
    actorUserId?: string,
  ): Promise<BaseRecipe> {
    const recipe = await this.recipeRepository.update(id, input, actorUserId);
    const visibleRecipe = recipe
      ? recipe
      : await this.recipeRepository.findById(id, actorUserId);

    return assertMutableRecipeResult(recipe, visibleRecipe, id, 'edited')!;
  }

  async save(id: string, actorUserId?: string): Promise<BaseRecipe> {
    return assertVisibleRecipe(
      await this.recipeRepository.saveSystemRecipe(id, actorUserId),
      id,
    );
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    const deleted = await this.recipeRepository.delete(id, actorUserId);

    if (!deleted) {
      const visibleRecipe = await this.recipeRepository.findById(id, actorUserId);
      assertMutableRecipeResult(null, visibleRecipe, id, 'deleted');
    }
  }
}
