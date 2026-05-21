import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsService } from './ingredients.service';

describe('IngredientsService inventory', () => {
  let service: IngredientsService;
  let prisma: {
    ingredient: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    kitchenInventoryItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      ingredient: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      kitchenInventoryItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    service = new IngredientsService(prisma as unknown as PrismaService);
  });

  const createdAt = new Date('2026-05-08T12:00:00.000Z');
  const ingredient = {
    id: 'ingredient-rice',
    canonicalName: 'rice',
    slug: 'rice',
    aliases: [],
    category: 'pantry',
    defaultUnit: 'cup',
    visionLabels: [],
    createdAt,
    updatedAt: createdAt,
  };

  it('creates unresolved freeform inventory items without canonical ingredient ids', async () => {
    prisma.kitchenInventoryItem.create.mockResolvedValue({
      id: 'inventory-1',
      userId: 'user-1',
      ingredientId: null,
      ingredient: null,
      displayName: 'mystery green jar',
      normalizedName: 'mystery green jar',
      label: null,
      estimatedAmount: 1,
      unit: 'jar',
      source: 'manual',
      confidence: 'medium',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.addInventoryItem('user-1', {
      display_name: 'Mystery Green Jar',
    });

    expect(prisma.kitchenInventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          ingredientId: undefined,
          displayName: 'Mystery Green Jar',
          normalizedName: 'mystery green jar',
          estimatedAmount: 1,
          unit: 'jar',
          confidence: 'medium',
          reviewStatus: 'active',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ingredient_id: undefined,
        ingredient: undefined,
        display_name: 'mystery green jar',
        estimated_amount: 1,
        unit: 'jar',
        review_status: 'active',
      }),
    );
  });

  it('creates linked inventory items when ingredient_id is provided', async () => {
    prisma.ingredient.findUnique.mockResolvedValue(ingredient);
    prisma.kitchenInventoryItem.create.mockResolvedValue({
      id: 'inventory-1',
      userId: 'user-1',
      ingredientId: ingredient.id,
      ingredient,
      displayName: 'olive oil bottle',
      normalizedName: 'olive oil bottle',
      label: 'olive oil bottle',
      estimatedAmount: 1,
      unit: 'unit',
      source: 'manual',
      confidence: 'high',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    await service.addInventoryItem('user-1', {
      ingredient_id: ingredient.id,
      label: 'olive oil bottle',
      estimated_amount: 1,
      unit: 'unit',
    });

    expect(prisma.kitchenInventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredientId: ingredient.id,
          displayName: 'olive oil bottle',
          normalizedName: 'olive oil bottle',
          estimatedAmount: 1,
          unit: 'unit',
          confidence: 'high',
        }),
      }),
    );
  });

  it('uses linked ingredient defaults when quantity and unit are omitted', async () => {
    prisma.ingredient.findUnique.mockResolvedValue(ingredient);
    prisma.kitchenInventoryItem.create.mockResolvedValue({
      id: 'inventory-1',
      userId: 'user-1',
      ingredientId: ingredient.id,
      ingredient,
      displayName: 'rice',
      normalizedName: 'rice',
      label: null,
      estimatedAmount: 1,
      unit: 'cup',
      source: 'manual',
      confidence: 'high',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    await service.addInventoryItem('user-1', {
      ingredient_id: ingredient.id,
    });

    expect(prisma.kitchenInventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredientId: ingredient.id,
          displayName: 'rice',
          estimatedAmount: 1,
          unit: 'cup',
        }),
      }),
    );
  });

  it('rejects missing explicit ingredient ids', async () => {
    prisma.ingredient.findUnique.mockResolvedValue(null);

    await expect(
      service.addInventoryItem('user-1', {
        ingredient_id: 'missing-ingredient',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a name when no ingredient can provide one', async () => {
    await expect(service.addInventoryItem('user-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('syncs legacy label updates into displayName for compatibility', async () => {
    prisma.kitchenInventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.kitchenInventoryItem.findUniqueOrThrow.mockResolvedValue({
      id: 'inventory-1',
      userId: 'user-1',
      ingredientId: null,
      ingredient: null,
      displayName: 'renamed jar',
      normalizedName: 'renamed jar',
      label: 'renamed jar',
      estimatedAmount: null,
      unit: null,
      source: 'manual',
      confidence: 'medium',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    await service.updateInventoryItem('user-1', 'inventory-1', {
      label: 'Renamed Jar',
    });

    expect(prisma.kitchenInventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: 'Renamed Jar',
          normalizedName: 'renamed jar',
          label: 'Renamed Jar',
        }),
      }),
    );
  });

  it('stores checkout product title as label and canonical ingredient as displayName', async () => {
    prisma.ingredient.upsert.mockResolvedValue({
      ...ingredient,
      canonicalName: 'flour',
      slug: 'flour',
      defaultUnit: 'lb',
    });
    prisma.kitchenInventoryItem.findFirst.mockResolvedValue(null);
    prisma.kitchenInventoryItem.create.mockResolvedValue({
      id: 'inventory-flour',
      userId: 'user-1',
      ingredientId: 'ingredient-flour',
      ingredient: {
        ...ingredient,
        id: 'ingredient-flour',
        canonicalName: 'flour',
        slug: 'flour',
        defaultUnit: 'lb',
      },
      displayName: 'flour',
      normalizedName: 'flour',
      label: 'Great Value All-Purpose Flour 5 lb',
      estimatedAmount: 5,
      unit: 'lb',
      source: 'cart',
      confidence: 'medium',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    await service.addPurchasedCartItemsToInventory('user-1', [
      {
        canonical_ingredient: 'flour',
        needed_amount: 5,
        needed_unit: 'lb',
        walmart_search_query: 'flour',
        selected_product: {
          product_id: 'flour-1',
          title: 'Great Value All-Purpose Flour 5 lb',
          brand: 'Great Value',
          price: 3.24,
          currency: 'USD',
        },
      },
    ]);

    expect(prisma.kitchenInventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: 'flour',
          normalizedName: 'flour',
          label: 'Great Value All-Purpose Flour 5 lb',
          estimatedAmount: 5,
          unit: 'lb',
          source: 'cart',
        }),
      }),
    );
  });

  it('normalizes older cart-created checkout rows while preserving manual display names', async () => {
    prisma.ingredient.upsert.mockResolvedValue({
      ...ingredient,
      canonicalName: 'flour',
      slug: 'flour',
      defaultUnit: 'lb',
    });
    prisma.kitchenInventoryItem.findFirst.mockResolvedValue({
      id: 'inventory-flour',
      userId: 'user-1',
      ingredientId: 'ingredient-flour',
      displayName: 'Great Value All-Purpose Flour 5 lb',
      normalizedName: 'great value all-purpose flour 5 lb',
      label: null,
      estimatedAmount: 3,
      unit: 'lb',
      source: 'cart',
      confidence: 'medium',
      reviewStatus: 'active',
      createdAt,
      updatedAt: createdAt,
    });

    await service.addPurchasedCartItemsToInventory('user-1', [
      {
        canonical_ingredient: 'flour',
        needed_amount: 2,
        needed_unit: 'lb',
        walmart_search_query: 'flour',
        selected_product: {
          product_id: 'flour-1',
          title: 'Great Value All-Purpose Flour 5 lb',
          brand: 'Great Value',
          price: 3.24,
          currency: 'USD',
        },
      },
    ]);

    expect(prisma.kitchenInventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inventory-flour' },
        data: expect.objectContaining({
          displayName: 'flour',
          normalizedName: 'flour',
          label: 'Great Value All-Purpose Flour 5 lb',
          estimatedAmount: 5,
        }),
      }),
    );
  });
});
