import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaptureService } from './capture.service';

const importedRecipe = {
  name: 'Spicy Rigatoni',
  cuisine: 'Italian',
  description: 'A tomato cream pasta draft.',
  servings: 2,
  ingredients: [
    {
      canonical_ingredient: 'rigatoni',
      amount: 8,
      unit: 'oz',
      display_ingredient: 'rigatoni',
      preparation: null,
      optional: false,
      group: null,
    },
  ],
  steps: [{ step: 1, what_to_do: 'Boil pasta and toss with sauce.' }],
  tags: ['pasta'],
  nutrition_estimate: null,
  estimated_cost_tier: 'medium' as const,
  cost_notes: [],
  quality_tradeoffs: [],
  assumptions: ['Assumes pantry salt.'],
};

function captureRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'capture-1',
    userId: 'user-1',
    inputKind: 'text',
    sourceKind: 'pasted_text',
    resultKind: 'partial_recipe_import',
    status: 'ready_for_review',
    confidence: 'medium',
    needsReview: true,
    sourceUrl: null,
    sourceTextSnippet: 'ingredients: pasta',
    savedRecipeId: null,
    attribution: { attribution_label: 'Generated from pasted text' },
    recipePreview: importedRecipe,
    assumptions: [],
    missingInfo: [],
    nextActions: ['edit_draft'],
    extractionNotes: [],
    shortSnippets: [],
    errorMessage: null,
    createdAt: new Date('2026-05-09T00:00:00.000Z'),
    updatedAt: new Date('2026-05-09T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CaptureService', () => {
  let prisma: {
    capture: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    cuisine: {
      findUnique: jest.Mock;
    };
  };
  let aiService: {
    importRecipeFromCapture: jest.Mock;
  };
  let recipeService: {
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let service: CaptureService;

  beforeEach(() => {
    prisma = {
      capture: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      cuisine: {
        findUnique: jest.fn(),
      },
    };
    aiService = {
      importRecipeFromCapture: jest.fn(),
    };
    recipeService = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    service = new CaptureService(
      prisma as never,
      aiService as never,
      recipeService as never,
    );

    aiService.importRecipeFromCapture.mockResolvedValue({
      source_url: 'chef-capture://pasted-text',
      platform: 'generic',
      source_title: 'Spicy rigatoni note',
      source_creator: null,
      source_description: 'ingredients: pasta',
      imported_recipe: importedRecipe,
      extraction_notes: [
        'Structured from pasted user text. No external source was fetched.',
      ],
    });
    prisma.capture.create.mockImplementation(({ data }) =>
      Promise.resolve(captureRecord(data)),
    );
    prisma.cuisine.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(
        where.slug === 'italian' || where.slug === 'other'
          ? { id: `cuisine-${where.slug}` }
          : null,
      ),
    );
    recipeService.create.mockResolvedValue({ id: 'recipe-1' });
  });

  it('creates a reviewable pasted-text capture without treating status as result kind', async () => {
    const result = await service.createCapture('user-1', {
      text: 'ingredients: rigatoni, tomato, cream\nsteps: cook pasta',
    });

    expect(aiService.importRecipeFromCapture).toHaveBeenCalledWith({
      url: undefined,
      text: 'ingredients: rigatoni, tomato, cream\nsteps: cook pasta',
    });
    expect(prisma.capture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inputKind: 'text',
          sourceKind: 'pasted_text',
          resultKind: 'partial_recipe_import',
          status: 'ready_for_review',
          needsReview: true,
        }),
      }),
    );
    expect(result.needs_review).toBe(true);
    expect(result.result_kind).not.toBe('needs_more_info');
  });

  it('classifies social URLs as reconstructed recipe drafts', async () => {
    aiService.importRecipeFromCapture.mockResolvedValueOnce({
      source_url: 'https://www.tiktok.com/@chef/video/123',
      platform: 'tiktok',
      source_title: 'Creator pasta',
      source_creator: 'creator',
      source_description: 'quick pasta',
      imported_recipe: importedRecipe,
      extraction_notes: [],
    });

    await service.createCapture('user-1', {
      url: 'https://www.tiktok.com/@chef/video/123',
    });

    expect(prisma.capture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inputKind: 'url',
          sourceKind: 'social_url',
          resultKind: 'reconstructed_recipe',
        }),
      }),
    );
  });

  it('rejects empty capture input', async () => {
    await expect(service.createCapture('user-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not let explicit text captures accidentally use URL input', async () => {
    await expect(
      service.createCapture('user-1', {
        input_kind: 'text',
        url: 'https://example.com/recipe',
        text: 'make pasta',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only captures owned by the requesting user', async () => {
    prisma.capture.findFirst.mockResolvedValue(null);

    await expect(
      service.getCapture('user-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.capture.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing', userId: 'user-1' },
    });
  });

  it('saves a capture recipe preview as a user-owned recipe', async () => {
    prisma.capture.findFirst.mockResolvedValue(captureRecord());

    const recipe = await service.saveCaptureAsRecipe('user-1', 'capture-1');

    expect(recipeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Spicy Rigatoni',
        cuisine_id: 'cuisine-italian',
        ingredients: expect.arrayContaining([
          expect.objectContaining({ canonical_ingredient: 'rigatoni' }),
        ]),
      }),
      'user-1',
    );
    expect(prisma.capture.update).toHaveBeenCalledWith({
      where: { id: 'capture-1' },
      data: {
        status: 'saved',
        savedRecipeId: 'recipe-1',
      },
    });
    expect(recipe).toEqual({ id: 'recipe-1' });
  });

  it('returns the existing saved recipe for an already-saved capture', async () => {
    prisma.capture.findFirst.mockResolvedValue(
      captureRecord({ savedRecipeId: 'recipe-1', status: 'saved' }),
    );
    recipeService.findOne.mockResolvedValue({ id: 'recipe-1' });

    await expect(
      service.saveCaptureAsRecipe('user-1', 'capture-1'),
    ).resolves.toEqual({ id: 'recipe-1' });

    expect(recipeService.create).not.toHaveBeenCalled();
  });
});
