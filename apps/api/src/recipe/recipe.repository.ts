import { Injectable, NotFoundException } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { mapBaseRecipe } from './recipe.mapper';
import { DEFAULT_DEV_USER_EMAIL } from '../user/user-context.constants';

@Injectable()
export class RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveActorUser(actorUserId?: string): Promise<{ id: string }> {
    if (actorUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true },
      });

      if (!actor) {
        throw new NotFoundException(`User ${actorUserId} not found`);
      }

      return actor;
    }

    const defaultActor = await this.prisma.user.findUnique({
      where: { email: DEFAULT_DEV_USER_EMAIL },
      select: { id: true },
    });

    if (!defaultActor) {
      throw new NotFoundException(
        `Default dev user ${DEFAULT_DEV_USER_EMAIL} not found`,
      );
    }

    return defaultActor;
  }

  async create(input: CreateRecipeDto, actorUserId?: string): Promise<BaseRecipe> {
    const actor = await this.resolveActorUser(actorUserId);

    const recipe = await this.prisma.baseRecipe.create({
      data: {
        ownerUserId: actor.id,
        isSystemRecipe: false,
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

  async findMany(actorUserId?: string): Promise<BaseRecipe[]> {
    const actor = await this.resolveActorUser(actorUserId);

    const recipes = await this.prisma.baseRecipe.findMany({
      where: {
        OR: [{ isSystemRecipe: true }, { ownerUserId: actor.id }],
      },
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

  async findById(id: string, actorUserId?: string): Promise<BaseRecipe | null> {
    const actor = await this.resolveActorUser(actorUserId);

    const recipe = await this.prisma.baseRecipe.findFirst({
      where: {
        id,
        OR: [{ isSystemRecipe: true }, { ownerUserId: actor.id }],
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return recipe ? mapBaseRecipe(recipe) : null;
  }
}
