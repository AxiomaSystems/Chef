import { Injectable } from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { mapBaseRecipe } from './recipe.mapper';
import {
  buildCreateRecipeData,
  buildOwnedMutableRecipeWhere,
  buildUpdateRecipeData,
  buildVisibleRecipeWhere,
} from './recipe.persistence.mapper';
import { UserContextService } from '../user/user-context.service';

@Injectable()
export class RecipeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
  ) {}

  private resolveOptionalActorUser(
    actorUserId?: string,
  ): Promise<{ id: string } | null> {
    return this.userContextService.resolveOptionalActorUser(actorUserId);
  }

  private resolveActorUser(actorUserId?: string): Promise<{ id: string }> {
    return this.userContextService.resolveActorUser(actorUserId);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code === 'P2002'
        : typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
    );
  }

  private findExistingFork(ownerUserId: string, sourceRecipeId: string) {
    return this.prisma.baseRecipe.findFirst({
      where: {
        ownerUserId,
        forkedFromRecipeId: sourceRecipeId,
        isSystemRecipe: false,
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });
  }

  async create(input: CreateRecipeDto, actorUserId?: string): Promise<BaseRecipe> {
    const actor = await this.resolveActorUser(actorUserId);

    const recipe = await this.prisma.baseRecipe.create({
      data: buildCreateRecipeData(input, actor.id),
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return mapBaseRecipe(recipe);
  }

  async findMany(actorUserId?: string): Promise<BaseRecipe[]> {
    const actor = await this.resolveOptionalActorUser(actorUserId);

    const recipes = await this.prisma.baseRecipe.findMany({
      where: buildVisibleRecipeWhere(actor?.id),
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
    const actor = await this.resolveOptionalActorUser(actorUserId);

    const recipe = await this.prisma.baseRecipe.findFirst({
      where: {
        id,
        ...buildVisibleRecipeWhere(actor?.id),
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return recipe ? mapBaseRecipe(recipe) : null;
  }

  async findManyByIds(
    ids: string[],
    actorUserId?: string,
  ): Promise<BaseRecipe[]> {
    const actor = await this.resolveOptionalActorUser(actorUserId);

    const recipes = await this.prisma.baseRecipe.findMany({
      where: {
        id: { in: ids },
        ...buildVisibleRecipeWhere(actor?.id),
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return recipes.map(mapBaseRecipe);
  }

  async update(
    id: string,
    input: UpdateRecipeDto,
    actorUserId?: string,
  ): Promise<BaseRecipe | null> {
    const actor = await this.resolveActorUser(actorUserId);
    const existing = await this.prisma.baseRecipe.findFirst({
      where: buildOwnedMutableRecipeWhere(id, actor.id),
      include: {
        ingredients: true,
        steps: true,
      },
    });

    if (!existing) {
      return null;
    }

    const recipe = await this.prisma.baseRecipe.update({
      where: { id },
      data: buildUpdateRecipeData(input),
      include: {
        ingredients: true,
        steps: true,
      },
    });

    return mapBaseRecipe(recipe);
  }

  async saveSystemRecipe(
    id: string,
    actorUserId?: string,
  ): Promise<{ recipe: BaseRecipe | null; created: boolean }> {
    const actor = await this.resolveActorUser(actorUserId);
    const sourceRecipe = await this.prisma.baseRecipe.findFirst({
      where: {
        id,
        isSystemRecipe: true,
        ownerUserId: null,
      },
      include: {
        ingredients: true,
        steps: true,
      },
    });

    if (!sourceRecipe) {
      return { recipe: null, created: false };
    }

    const existingFork = await this.findExistingFork(actor.id, sourceRecipe.id);

    if (existingFork) {
      return { recipe: mapBaseRecipe(existingFork), created: false };
    }

    try {
      const savedRecipe = await this.prisma.baseRecipe.create({
        data: {
          ownerUserId: actor.id,
          forkedFromRecipeId: sourceRecipe.id,
          isSystemRecipe: false,
          name: sourceRecipe.name,
          cuisine: sourceRecipe.cuisine,
          description: sourceRecipe.description,
          servings: sourceRecipe.servings,
          tags: sourceRecipe.tags,
          ingredients: {
            create: sourceRecipe.ingredients.map((ingredient) => ({
              canonicalIngredient: ingredient.canonicalIngredient,
              amount: ingredient.amount,
              unit: ingredient.unit,
              displayIngredient: ingredient.displayIngredient,
              preparation: ingredient.preparation,
              optional: ingredient.optional,
              ingredientGroup: ingredient.ingredientGroup,
              sortOrder: ingredient.sortOrder,
            })),
          },
          steps: {
            create: sourceRecipe.steps.map((step) => ({
              stepNumber: step.stepNumber,
              whatToDo: step.whatToDo,
            })),
          },
        },
        include: {
          ingredients: true,
          steps: true,
        },
      });

      return { recipe: mapBaseRecipe(savedRecipe), created: true };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const concurrentFork = await this.findExistingFork(actor.id, sourceRecipe.id);

        if (concurrentFork) {
          return { recipe: mapBaseRecipe(concurrentFork), created: false };
        }
      }

      throw error;
    }
  }

  async delete(id: string, actorUserId?: string): Promise<boolean> {
    const actor = await this.resolveActorUser(actorUserId);
    const existing = await this.prisma.baseRecipe.findFirst({
      where: buildOwnedMutableRecipeWhere(id, actor.id),
      select: { id: true },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.baseRecipe.delete({
      where: { id },
    });

    return true;
  }
}
