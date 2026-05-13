import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
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
    service = new VisionService(
      new MockVisionDetectorProvider(),
      prisma as never,
      ingredientsService as never,
    );
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

  it('describes the stage-1 product-facing pipeline', () => {
    const pipeline = service.describePipeline();

    expect(pipeline.provider).toBe('mock-stage1-detector');
    expect(pipeline.stage).toBe('detection_only');
    expect(pipeline.tracking_enabled).toBe(false);
    expect(pipeline.supported_classes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'olive_oil_bottle',
          inventory_policy: 'track',
        }),
        expect.objectContaining({
          id: 'spice_bottle',
          inventory_policy: 'track',
        }),
      ]),
    );
  });

  it('detects track and review candidates from scan frames', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          frame_ref: 'pantry shelf olive oil bottle egg carton',
        },
        {
          frame_id: 2,
          debug_objects: [{ label: 'jar', confidence: 0.71 }],
        },
      ],
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        frame_count: 2,
        detection_count: 3,
        track_candidate_count: 2,
        review_candidate_count: 1,
      }),
    );
    expect(result.summary.detected_labels).toEqual([
      'egg carton',
      'jar',
      'olive oil bottle',
    ]);
  });

  it('excludes ignored detections unless requested', async () => {
    const defaultResult = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          debug_objects: [{ label: 'plate' }],
        },
      ],
    });

    const includeIgnoredResult = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          debug_objects: [{ label: 'plate' }],
        },
      ],
      options: {
        include_ignored: true,
      },
    });

    expect(defaultResult.summary.detection_count).toBe(0);
    expect(includeIgnoredResult.summary).toEqual(
      expect.objectContaining({
        detection_count: 1,
        ignored_detection_count: 1,
      }),
    );
  });

  it('infers all exact closed-set labels from frame_ref text before generic labels', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan-2',
      frames: [
        {
          frame_id: 1,
          frame_ref: 'fridge shelf milk carton egg carton banana',
        },
        {
          frame_id: 2,
          frame_ref: 'counter bottle jar mug',
        },
      ],
      options: {
        include_ignored: false,
      },
    });

    expect(
      result.frames[0].detections.map((detection) => detection.label),
    ).toEqual(['banana', 'egg carton', 'milk carton']);
    expect(
      result.frames[1].detections.map((detection) => detection.label),
    ).toEqual(['bottle', 'jar']);
  });

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
