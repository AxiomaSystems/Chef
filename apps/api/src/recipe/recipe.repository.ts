import { Injectable } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { mapBaseRecipe } from './recipe.mapper';

@Injectable()
export class RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRecipeDto): Promise<BaseRecipe> {
    const recipe = await this.prisma.baseRecipe.create({
      data: {
        userId: input.user_id,
        name: input.name,
        cuisine: input.cuisine,
        description: input.description,
        servings: input.servings,
        tags: input.tags ?? [],
        ingredients: {
          create: input.ingredients.map((ingredient, index) => ({
            canonicalIngredient: ingredient.canonical_ingredient,
            amount: ingredient.amount,
            unit: ingredient.unit,
            displayIngredient: ingredient.display_ingredient,
            preparation: ingredient.preparation,
            optional: ingredient.optional ?? false,
            ingredientGroup: ingredient.group,
            sortOrder: index,
          })),
        },
        steps: {
          create: input.steps.map((step) => ({
            stepNumber: step.step,
            whatToDo: step.what_to_do,
          })),
        },
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return mapBaseRecipe(recipe);
  }

  async findMany(): Promise<BaseRecipe[]> {
    const recipes = await this.prisma.baseRecipe.findMany({
      include: {
        ingredients: true,
        steps: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return recipes.map(mapBaseRecipe);
  }

  async findById(id: string): Promise<BaseRecipe | null> {
    const recipe = await this.prisma.baseRecipe.findUnique({
      where: { id },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return recipe ? mapBaseRecipe(recipe) : null;
  }
}
