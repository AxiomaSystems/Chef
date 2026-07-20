import { VisionService } from './vision.service';

describe('VisionService', () => {
  let service: VisionService;
  let prisma: {
    visionObservation: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    ingredient: {
      findUnique: jest.Mock;
    };
    kitchenInventoryItem: {
      create: jest.Mock;
    };
  };
  let ingredientsService: {
    ensureIngredient: jest.Mock;
    normalizeName: jest.Mock;
  };

  const createdAt = new Date('2026-05-08T13:00:00.000Z');

  beforeEach(() => {
    prisma = {
      visionObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      ingredient: {
        findUnique: jest.fn(),
      },
      kitchenInventoryItem: {
        create: jest.fn(),
      },
    };
    ingredientsService = {
      ensureIngredient: jest.fn(),
      normalizeName: jest.fn((name: string) =>
        name.trim().replace(/\s+/g, ' ').toLowerCase(),
      ),
    };
    service = new VisionService(prisma as never, ingredientsService as never);
  });

  function observation(overrides: Record<string, unknown> = {}) {
    return {
      id: 'observation-1',
      userId: 'user-1',
      inventoryItemId: null,
      detectedLabel: 'bottle',
      proposedName: 'olive oil bottle',
      canonicalSlug: 'olive-oil',
      detectorModel: 'yolo-test',
      classifierModel: null,
      modelName: null,
      confidence: 0.82,
      imageRef: null,
      cropRef: null,
      bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      rawPayload: { source: 'unit-test' },
      action: 'pending',
      createdAt,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  it('creates persisted observations without creating inventory', async () => {
    prisma.visionObservation.create.mockResolvedValue(observation());

    const result = await service.createObservation('user-1', {
      detected_label: ' bottle ',
      proposed_name: 'olive oil bottle',
      canonical_slug: 'olive-oil',
      detector_model: 'yolo-test',
      confidence: 0.82,
      bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      raw_payload: { source: 'unit-test' },
    });

    expect(prisma.visionObservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          detectedLabel: 'bottle',
          proposedName: 'olive oil bottle',
          canonicalSlug: 'olive-oil',
        }),
      }),
    );
    expect(prisma.kitchenInventoryItem.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        detected_label: 'bottle',
        action: 'pending',
        inventory_item_id: undefined,
      }),
    );
  });

  it('adds an observation to inventory with canonical slug resolution', async () => {
    const ingredient = {
      id: 'ingredient-olive-oil',
      canonicalName: 'olive oil',
      slug: 'olive-oil',
    };
    prisma.visionObservation.findFirst.mockResolvedValue(observation());
    prisma.ingredient.findUnique.mockResolvedValue(ingredient);
    prisma.kitchenInventoryItem.create.mockResolvedValue({
      id: 'inventory-1',
    });
    prisma.visionObservation.update.mockResolvedValue(
      observation({
        inventoryItemId: 'inventory-1',
        action: 'resolved_to_ingredient',
      }),
    );

    const result = await service.addObservationToInventory(
      'user-1',
      'observation-1',
      {},
    );

    expect(prisma.kitchenInventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          ingredientId: 'ingredient-olive-oil',
          displayName: 'olive oil bottle',
          normalizedName: 'olive oil bottle',
          source: 'vision',
          confidence: 'high',
          reviewStatus: 'active',
        }),
      }),
    );
    expect(result.action).toBe('resolved_to_ingredient');
    expect(result.inventory_item_id).toBe('inventory-1');
  });

  it('discards observations without creating inventory', async () => {
    prisma.visionObservation.findFirst.mockResolvedValue(observation());
    prisma.visionObservation.update.mockResolvedValue(
      observation({ action: 'discarded' }),
    );

    const result = await service.discardObservation('user-1', 'observation-1');

    expect(prisma.kitchenInventoryItem.create).not.toHaveBeenCalled();
    expect(result.action).toBe('discarded');
  });
});
