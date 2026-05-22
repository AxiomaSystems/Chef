import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import type { HomeRecipeRecommendations, RecipeListPage } from '@cart/shared';
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
import { IngredientsService } from '../ingredients/ingredients.service';
import {
  buildHomeRecipeRecommendations,
  type RecipeRecommendationProfile,
} from './recipe.recommendations';

const RECIPE_INCLUDE = {
  cuisine: true,
  ingredients: true,
  recipeTags: {
    include: {
      tag: true,
    },
  },
  steps: true,
} satisfies Prisma.BaseRecipeInclude;

@Injectable()
export class RecipeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContextService: UserContextService,
    private readonly ingredientsService: IngredientsService,
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
    return error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code === 'P2002'
      : typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002';
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

  private async resolveIngredientIdsByIndex(
    ingredients?: Array<{ canonical_ingredient: string }>,
  ): Promise<Array<string | undefined> | undefined> {
    if (!ingredients) {
      return undefined;
    }

    const slugs = ingredients.map((ingredient) =>
      this.ingredientsService.normalizeSlug(ingredient.canonical_ingredient),
    );
    const ingredientIdsBySlug =
      await this.ingredientsService.resolveIngredientIdsBySlugs(slugs);

    return slugs.map((slug) => ingredientIdsBySlug.get(slug));
  }

  async create(
    input: CreateRecipeDto,
    actorUserId?: string,
  ): Promise<BaseRecipe> {
    const actor = await this.resolveActorUser(actorUserId);
    const tagIds = await this.validateTagIdsForActor(actor.id, input.tag_ids);
    const cuisineId = await this.validateCuisineId(input.cuisine_id);
    const ingredientIdsByIndex = await this.resolveIngredientIdsByIndex(
      input.ingredients,
    );

    const recipe = await this.prisma.baseRecipe.create({
      data: {
        ...buildCreateRecipeData(
          { ...input, cuisine_id: cuisineId },
          actor.id,
          ingredientIdsByIndex,
        ),
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
      include: RECIPE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return recipes.map(mapBaseRecipe);
  }

  async findManyPage(
    input: {
      limit: number;
      cursor?: string;
      q?: string;
      cuisine_id?: string;
      tag_id?: string;
      owner?: 'public' | 'mine' | 'saved';
    },
    actorUserId?: string,
  ): Promise<RecipeListPage> {
    const actor = await this.resolveOptionalActorUser(actorUserId);
    const cursor = decodeRecipeCursor(input.cursor);
    const limit = Math.min(Math.max(input.limit, 1), 100);
    const taxonomyFilters = buildRecipeListTaxonomyFilters(input);
    const ownerFilter = buildRecipeListOwnerFilter(input.owner, actor?.id);
    const filters = [...taxonomyFilters, ...ownerFilter];
    const listWhere: Prisma.BaseRecipeWhereInput = {
      AND: [
        buildVisibleRecipeWhere(actor?.id),
        ...filters,
        cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  createdAt: cursor.createdAt,
                  id: { lt: cursor.id },
                },
              ],
            }
          : {},
      ],
    };
    const countsWhere = (owner: 'public' | 'mine' | 'saved') => ({
      AND: [
        buildVisibleRecipeWhere(actor?.id),
        ...taxonomyFilters,
        ...buildRecipeListOwnerFilter(owner, actor?.id),
      ],
    });

    const [recipes, savedSourceRecipes, publicCount, mineCount, savedCount] =
      await Promise.all([
        this.prisma.baseRecipe.findMany({
          where: listWhere,
          include: RECIPE_INCLUDE,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        }),
        actor
          ? this.prisma.baseRecipe.findMany({
              where: {
                ownerUserId: actor.id,
                isSystemRecipe: false,
                forkedFromRecipeId: { not: null },
              },
              select: {
                forkedFromRecipeId: true,
              },
            })
          : Promise.resolve([]),
        this.prisma.baseRecipe.count({ where: countsWhere('public') }),
        actor
          ? this.prisma.baseRecipe.count({ where: countsWhere('mine') })
          : Promise.resolve(0),
        actor
          ? this.prisma.baseRecipe.count({ where: countsWhere('saved') })
          : Promise.resolve(0),
      ]);
    const pageItems = recipes.slice(0, limit);
    const mappedItems = pageItems.map(mapBaseRecipe);
    const nextItem = recipes[limit];

    return {
      items: mappedItems,
      next_cursor: nextItem
        ? encodeRecipeCursor(nextItem.createdAt, nextItem.id)
        : undefined,
      metadata: {
        saved_source_ids: Array.from(
          new Set(
            savedSourceRecipes
              .map((recipe) => recipe.forkedFromRecipeId)
              .filter((id): id is string => Boolean(id)),
          ),
        ),
        counts: {
          public: publicCount,
          mine: mineCount,
          saved: savedCount,
        },
      },
    };
  }

  async findHomeRecommendations(
    actorUserId: string,
  ): Promise<HomeRecipeRecommendations> {
    const actor = await this.resolveActorUser(actorUserId);
    const [recipes, profile] = await Promise.all([
      this.prisma.baseRecipe.findMany({
        where: buildVisibleRecipeWhere(actor.id),
        include: RECIPE_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 120,
      }),
      this.findRecommendationProfile(actor.id),
    ]);

    return buildHomeRecipeRecommendations(recipes.map(mapBaseRecipe), profile);
  }

  private async findRecommendationProfile(
    userId: string,
  ): Promise<RecipeRecommendationProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        favoriteProteins: true,
        favoriteFlavors: true,
        dislikedIngredients: true,
        preferredCookingTime: true,
        goalPriorities: true,
        preferredCuisines: {
          select: {
            cuisineId: true,
          },
        },
        preferredTags: {
          select: {
            tagId: true,
          },
        },
        foodRules: {
          where: {
            active: true,
            strictness: 'hard',
            action: { in: ['avoid', 'dislike'] },
          },
          select: {
            label: true,
            normalizedLabel: true,
          },
        },
      },
    });

    return {
      preferredCuisineIds:
        user?.preferredCuisines.map((entry) => entry.cuisineId) ?? [],
      preferredTagIds: user?.preferredTags.map((entry) => entry.tagId) ?? [],
      favoriteProteins: jsonStringArray(user?.favoriteProteins),
      favoriteFlavors: jsonStringArray(user?.favoriteFlavors),
      dislikedIngredients: jsonStringArray(user?.dislikedIngredients),
      preferredCookingTime: user?.preferredCookingTime,
      goalPriorities: jsonStringArray(user?.goalPriorities),
      hardAvoidLabels:
        user?.foodRules.flatMap((rule) => [rule.normalizedLabel, rule.label]) ??
        [],
    };
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
    const ingredientIdsByIndex = await this.resolveIngredientIdsByIndex(
      input.ingredients,
    );

    const recipe = await this.prisma.baseRecipe.update({
      where: { id },
      data: {
        ...buildUpdateRecipeData(
          {
            ...input,
            ...(cuisineId !== undefined ? { cuisine_id: cuisineId } : {}),
          },
          ingredientIdsByIndex,
        ),
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
          name: sourceRecipe.name.endsWith(' - You')
            ? sourceRecipe.name
            : `${sourceRecipe.name} - You`,
          description: sourceRecipe.description,
          coverImageUrl: sourceRecipe.coverImageUrl,
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
              ingredientId: ingredient.ingredientId,
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
        const concurrentFork = await this.findExistingFork(
          actor.id,
          sourceRecipe.id,
        );

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

function encodeRecipeCursor(createdAt: Date, id: string) {
  return Buffer.from(
    JSON.stringify({ created_at: createdAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeRecipeCursor(
  cursor?: string,
): { createdAt: Date; id: string } | null {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as { created_at?: unknown; id?: unknown };
    if (
      typeof parsed.created_at !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      return null;
    }

    const createdAt = new Date(parsed.created_at);
    if (Number.isNaN(createdAt.getTime())) return null;

    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function buildRecipeListTaxonomyFilters(input: {
  q?: string;
  cuisine_id?: string;
  tag_id?: string;
}): Prisma.BaseRecipeWhereInput[] {
  const filters: Prisma.BaseRecipeWhereInput[] = [];
  const query = input.q?.trim();

  if (input.cuisine_id) {
    filters.push({ cuisineId: input.cuisine_id });
  }

  if (input.tag_id) {
    filters.push({
      recipeTags: {
        some: {
          tagId: input.tag_id,
        },
      },
    });
  }

  if (query) {
    filters.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { cuisine: { label: { contains: query, mode: 'insensitive' } } },
        {
          recipeTags: {
            some: {
              tag: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          },
        },
        {
          ingredients: {
            some: {
              OR: [
                {
                  canonicalIngredient: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  displayIngredient: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  return filters;
}

function buildRecipeListOwnerFilter(
  owner?: 'public' | 'mine' | 'saved',
  actorId?: string,
): Prisma.BaseRecipeWhereInput[] {
  if (owner === 'public') {
    return [
      {
        isSystemRecipe: true,
        ownerUserId: null,
      },
    ];
  }

  if (owner === 'mine') {
    return actorId
      ? [
          {
            ownerUserId: actorId,
            isSystemRecipe: false,
            forkedFromRecipeId: null,
          },
        ]
      : [{ id: { in: [] } }];
  }

  if (owner === 'saved') {
    return actorId
      ? [
          {
            ownerUserId: actorId,
            isSystemRecipe: false,
            forkedFromRecipeId: { not: null },
          },
        ]
      : [{ id: { in: [] } }];
  }

  return [];
}
