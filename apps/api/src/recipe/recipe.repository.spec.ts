import { RecipeRepository } from './recipe.repository';
import { UserContextService } from '../user/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsService } from '../ingredients/ingredients.service';

describe('RecipeRepository visibility', () => {
  let repository: RecipeRepository;
  let prisma: {
    $transaction: jest.Mock;
    baseRecipe: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
  };
  let userContextService: {
    resolveActorUser: jest.Mock;
    resolveOptionalActorUser: jest.Mock;
  };
  let ingredientsService: {
    normalizeSlug: jest.Mock;
    resolveIngredientIdsBySlugs: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      baseRecipe: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    userContextService = {
      resolveActorUser: jest.fn(),
      resolveOptionalActorUser: jest.fn(),
    };

    ingredientsService = {
      normalizeSlug: jest.fn((value: string) =>
        value
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      ),
      resolveIngredientIdsBySlugs: jest.fn().mockResolvedValue(new Map()),
    };

    repository = new RecipeRepository(
      prisma as unknown as PrismaService,
      userContextService as unknown as UserContextService,
      ingredientsService as unknown as IngredientsService,
    );
  });

  it('lists system and owned recipes for user A', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'user-a',
    });

    await repository.findMany('user-a');

    expect(prisma.baseRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ isSystemRecipe: true }, { ownerUserId: 'user-a' }],
        },
      }),
    );
  });

  it('lists system and owned recipes for user B', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'user-b',
    });

    await repository.findMany('user-b');

    expect(prisma.baseRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ isSystemRecipe: true }, { ownerUserId: 'user-b' }],
        },
      }),
    );
  });

  it('lists system and owned recipes for admin', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'admin-1',
    });

    await repository.findMany('admin-1');

    expect(prisma.baseRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ isSystemRecipe: true }, { ownerUserId: 'admin-1' }],
        },
      }),
    );
  });

  it('lists only global system recipes for unauthenticated access', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue(null);

    await repository.findMany();

    expect(prisma.baseRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isSystemRecipe: true,
          ownerUserId: null,
        },
      }),
    );
  });

  it('paginates public recipes through server-side owner filters', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'user-a',
    });
    prisma.baseRecipe.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { forkedFromRecipeId: 'recipe-system-1' },
        { forkedFromRecipeId: 'recipe-system-2' },
        { forkedFromRecipeId: 'recipe-system-1' },
        { forkedFromRecipeId: null },
      ]);
    prisma.baseRecipe.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);

    const result = await repository.findManyPage(
      { limit: 24, owner: 'public' },
      'user-a',
    );

    const query = prisma.baseRecipe.findMany.mock.calls[0][0];
    expect(query.take).toBe(25);
    expect(prisma.baseRecipe.count).toHaveBeenCalledTimes(3);
    expect(result.metadata).toEqual({
      saved_source_ids: ['recipe-system-1', 'recipe-system-2'],
      counts: {
        public: 12,
        mine: 3,
        saved: 2,
      },
    });
    expect(query.where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ isSystemRecipe: true }, { ownerUserId: 'user-a' }] },
        { isSystemRecipe: true, ownerUserId: null },
      ]),
    );
  });

  it('paginates saved recipes through server-side owner filters', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'user-a',
    });

    await repository.findManyPage({ limit: 24, owner: 'saved' }, 'user-a');

    const query = prisma.baseRecipe.findMany.mock.calls[0][0];
    expect(prisma.baseRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { forkedFromRecipeId: true },
      }),
    );
    expect(query.where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ isSystemRecipe: true }, { ownerUserId: 'user-a' }] },
        {
          ownerUserId: 'user-a',
          isSystemRecipe: false,
          forkedFromRecipeId: { not: null },
        },
      ]),
    );
  });

  it('paginates recipes through server-side search and taxonomy filters', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({
      id: 'user-a',
    });

    await repository.findManyPage(
      {
        limit: 24,
        q: 'okra',
        cuisine_id: 'cuisine-west-african',
        tag_id: 'tag-quick',
      },
      'user-a',
    );

    const query = prisma.baseRecipe.findMany.mock.calls[0][0];
    expect(query.where.AND).toEqual(
      expect.arrayContaining([
        { cuisineId: 'cuisine-west-african' },
        { recipeTags: { some: { tagId: 'tag-quick' } } },
        expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: 'okra', mode: 'insensitive' } },
            { description: { contains: 'okra', mode: 'insensitive' } },
            {
              ingredients: {
                some: {
                  OR: expect.arrayContaining([
                    {
                      canonicalIngredient: {
                        contains: 'okra',
                        mode: 'insensitive',
                      },
                    },
                  ]),
                },
              },
            },
          ]),
        }),
      ]),
    );
  });

  it('finds a recipe by id with the same visibility rules for unauthenticated access', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue(null);

    await repository.findById('recipe-1');

    expect(prisma.baseRecipe.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'recipe-1',
          isSystemRecipe: true,
          ownerUserId: null,
        },
      }),
    );
  });

  it('returns an existing saved fork instead of creating a duplicate fork', async () => {
    userContextService.resolveActorUser.mockResolvedValue({ id: 'user-a' });
    prisma.baseRecipe.findFirst
      .mockResolvedValueOnce({
        id: 'recipe-system-1',
        ownerUserId: null,
        forkedFromRecipeId: null,
        cuisineId: 'cuisine-peruvian',
        isSystemRecipe: true,
        name: 'Aji de gallina',
        cuisine: {
          id: 'cuisine-peruvian',
          slug: 'peruvian',
          label: 'Peruvian',
          kind: 'national',
          createdAt: new Date('2026-03-19T00:00:00.000Z'),
          updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        },
        description: null,
        servings: 4,
        createdAt: new Date('2026-03-19T00:00:00.000Z'),
        updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        ingredients: [],
        recipeTags: [],
        steps: [],
      })
      .mockResolvedValueOnce({
        id: 'recipe-user-copy-1',
        ownerUserId: 'user-a',
        forkedFromRecipeId: 'recipe-system-1',
        cuisineId: 'cuisine-peruvian',
        isSystemRecipe: false,
        name: 'Aji de gallina',
        cuisine: {
          id: 'cuisine-peruvian',
          slug: 'peruvian',
          label: 'Peruvian',
          kind: 'national',
          createdAt: new Date('2026-03-19T00:10:00.000Z'),
          updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        },
        description: null,
        servings: 4,
        createdAt: new Date('2026-03-19T00:10:00.000Z'),
        updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        ingredients: [],
        recipeTags: [],
        steps: [],
      });

    const result = await repository.saveSystemRecipe(
      'recipe-system-1',
      'user-a',
    );

    expect(prisma.baseRecipe.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      created: false,
      recipe: {
        id: 'recipe-user-copy-1',
        owner_user_id: 'user-a',
        forked_from_recipe_id: 'recipe-system-1',
        is_system_recipe: false,
      },
    });
  });

  it('returns the concurrent saved fork when the database unique constraint is hit', async () => {
    userContextService.resolveActorUser.mockResolvedValue({ id: 'user-a' });
    prisma.baseRecipe.findFirst
      .mockResolvedValueOnce({
        id: 'recipe-system-1',
        ownerUserId: null,
        forkedFromRecipeId: null,
        cuisineId: 'cuisine-peruvian',
        isSystemRecipe: true,
        name: 'Aji de gallina',
        cuisine: {
          id: 'cuisine-peruvian',
          slug: 'peruvian',
          label: 'Peruvian',
          kind: 'national',
          createdAt: new Date('2026-03-19T00:00:00.000Z'),
          updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        },
        description: null,
        servings: 4,
        createdAt: new Date('2026-03-19T00:00:00.000Z'),
        updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        ingredients: [],
        recipeTags: [],
        steps: [],
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'recipe-user-copy-1',
        ownerUserId: 'user-a',
        forkedFromRecipeId: 'recipe-system-1',
        cuisineId: 'cuisine-peruvian',
        isSystemRecipe: false,
        name: 'Aji de gallina',
        cuisine: {
          id: 'cuisine-peruvian',
          slug: 'peruvian',
          label: 'Peruvian',
          kind: 'national',
          createdAt: new Date('2026-03-19T00:10:00.000Z'),
          updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        },
        description: null,
        servings: 4,
        createdAt: new Date('2026-03-19T00:10:00.000Z'),
        updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        ingredients: [],
        recipeTags: [],
        steps: [],
      });
    prisma.baseRecipe.create.mockRejectedValue({
      code: 'P2002',
      name: 'PrismaClientKnownRequestError',
    });

    const result = await repository.saveSystemRecipe(
      'recipe-system-1',
      'user-a',
    );

    expect(result).toMatchObject({
      created: false,
      recipe: {
        id: 'recipe-user-copy-1',
        owner_user_id: 'user-a',
        forked_from_recipe_id: 'recipe-system-1',
        is_system_recipe: false,
      },
    });
  });
});
