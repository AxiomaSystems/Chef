import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
        steps: true,
      },
    });
  }

  private async validateTagIdsForActor(ownerUserId: string, tagIds?: string[]) {
    const uniqueTagIds = Array.from(new Set((tagIds ?? []).filter(Boolean)));

    if (uniqueTagIds.length === 0) {
      return [];
    }

    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: uniqueTagIds },
      },
    });

    if (tags.length !== uniqueTagIds.length) {
      throw new BadRequestException('One or more tag_ids are invalid');
    }

    const forbiddenTag = tags.find(
      (tag) => tag.scope === 'user' && tag.ownerUserId !== ownerUserId,
    );

    if (forbiddenTag) {
      throw new ForbiddenException(
        'You can only assign your own user tags or shared system tags',
      );
    }

    return uniqueTagIds;
  }

  private async validateCuisineId(cuisineId: string) {
    const cuisine = await this.prisma.cuisine.findUnique({
      where: { id: cuisineId },
    });

    if (!cuisine) {
      throw new BadRequestException('cuisine_id is invalid');
    }

    return cuisine.id;
  }

  async create(input: CreateRecipeDto, actorUserId?: string): Promise<BaseRecipe> {
    const actor = await this.resolveActorUser(actorUserId);
    const tagIds = await this.validateTagIdsForActor(actor.id, input.tag_ids);
    const cuisineId = await this.validateCuisineId(input.cuisine_id);

    const recipe = await this.prisma.baseRecipe.create({
      data: {
        ...buildCreateRecipeData({ ...input, cuisine_id: cuisineId }, actor.id),
        recipeTags: {
          create: tagIds.map((tagId) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        },
      },
      include: {
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
        steps: true,
      },
    });

    if (!existing) {
      return null;
    }

    const tagIds =
      input.tag_ids !== undefined
        ? await this.validateTagIdsForActor(actor.id, input.tag_ids)
        : null;
    const cuisineId =
      input.cuisine_id !== undefined
        ? await this.validateCuisineId(input.cuisine_id)
        : undefined;

    const recipe = await this.prisma.baseRecipe.update({
      where: { id },
      data: {
        ...buildUpdateRecipeData({
          ...input,
          ...(cuisineId !== undefined ? { cuisine_id: cuisineId } : {}),
        }),
        ...(tagIds !== null
          ? {
              recipeTags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({
                  tag: {
                    connect: { id: tagId },
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
        cuisine: true,
        ingredients: true,
        recipeTags: {
          include: {
            tag: true,
          },
        },
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
          cuisineId: sourceRecipe.cuisineId,
          isSystemRecipe: false,
          name: sourceRecipe.name,
          description: sourceRecipe.description,
          servings: sourceRecipe.servings,
          recipeTags: {
            create: (sourceRecipe.recipeTags ?? []).map((recipeTag) => ({
              tag: {
                connect: {
                  id: recipeTag.tagId,
                },
              },
            })),
          },
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
          cuisine: true,
          ingredients: true,
          recipeTags: {
            include: {
              tag: true,
            },
          },
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
