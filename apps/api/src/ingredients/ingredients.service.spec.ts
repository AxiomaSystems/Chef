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
      findMany: jest.Mock;
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
        findMany: jest.fn(),
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
      estimatedAmount: null,
      unit: null,
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
          confidence: 'high',
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
});
