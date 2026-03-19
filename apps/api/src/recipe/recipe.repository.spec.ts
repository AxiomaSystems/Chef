import { RecipeRepository } from './recipe.repository';
import { UserContextService } from '../user/user-context.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RecipeRepository visibility', () => {
  let repository: RecipeRepository;
  let prisma: {
    baseRecipe: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let userContextService: {
    resolveActorUser: jest.Mock;
    resolveOptionalActorUser: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      baseRecipe: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };

    userContextService = {
      resolveActorUser: jest.fn(),
      resolveOptionalActorUser: jest.fn(),
    };

    repository = new RecipeRepository(
      prisma as unknown as PrismaService,
      userContextService as unknown as UserContextService,
    );
  });

  it('lists system and owned recipes for user A', async () => {
    userContextService.resolveOptionalActorUser.mockResolvedValue({ id: 'user-a' });

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
    userContextService.resolveOptionalActorUser.mockResolvedValue({ id: 'user-b' });

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
    userContextService.resolveOptionalActorUser.mockResolvedValue({ id: 'admin-1' });

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
        isSystemRecipe: true,
        name: 'Aji de gallina',
        cuisine: 'Peruvian',
        description: null,
        servings: 4,
        tags: ['dinner'],
        createdAt: new Date('2026-03-19T00:00:00.000Z'),
        updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        ingredients: [],
        steps: [],
      })
      .mockResolvedValueOnce({
        id: 'recipe-user-copy-1',
        ownerUserId: 'user-a',
        forkedFromRecipeId: 'recipe-system-1',
        isSystemRecipe: false,
        name: 'Aji de gallina',
        cuisine: 'Peruvian',
        description: null,
        servings: 4,
        tags: ['dinner'],
        createdAt: new Date('2026-03-19T00:10:00.000Z'),
        updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        ingredients: [],
        steps: [],
      });

    const result = await repository.saveSystemRecipe('recipe-system-1', 'user-a');

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
        isSystemRecipe: true,
        name: 'Aji de gallina',
        cuisine: 'Peruvian',
        description: null,
        servings: 4,
        tags: ['dinner'],
        createdAt: new Date('2026-03-19T00:00:00.000Z'),
        updatedAt: new Date('2026-03-19T00:00:00.000Z'),
        ingredients: [],
        steps: [],
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'recipe-user-copy-1',
        ownerUserId: 'user-a',
        forkedFromRecipeId: 'recipe-system-1',
        isSystemRecipe: false,
        name: 'Aji de gallina',
        cuisine: 'Peruvian',
        description: null,
        servings: 4,
        tags: ['dinner'],
        createdAt: new Date('2026-03-19T00:10:00.000Z'),
        updatedAt: new Date('2026-03-19T00:10:00.000Z'),
        ingredients: [],
        steps: [],
      });
    prisma.baseRecipe.create.mockRejectedValue({
      code: 'P2002',
      name: 'PrismaClientKnownRequestError',
    });

    const result = await repository.saveSystemRecipe('recipe-system-1', 'user-a');

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
