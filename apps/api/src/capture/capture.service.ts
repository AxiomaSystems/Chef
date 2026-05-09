import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BaseRecipe,
  Capture,
  CaptureConfidence,
  CaptureInputKind,
  CaptureRecipePreview,
  CaptureResultKind,
  CaptureSourceAttribution,
  CaptureSourceKind,
} from '@cart/shared';
import type { Prisma } from '../../generated/prisma';
import { AiService } from '../ai/ai.service';
import type {
  AiRecipeImportResult,
  AiRecipeImportPlatform,
} from '../ai/ai.types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRecipeDto } from '../recipe/dto/create-recipe.dto';
import { RecipeService } from '../recipe/recipe.service';
import { CreateCaptureDto } from './dto/create-capture.dto';
import { mapCapture } from './capture.mapper';

const SUPPORTED_RESULT_KINDS: CaptureResultKind[] = [
  'exact_recipe_import',
  'partial_recipe_import',
  'reconstructed_recipe',
  'inspired_recipe',
];

@Injectable()
export class CaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly recipeService: RecipeService,
  ) {}

  async createCapture(
    userId: string,
    input: CreateCaptureDto,
  ): Promise<Capture> {
    const normalizedUrl = input.url?.trim();
    const normalizedText = input.text?.trim();
    const inputKind = this.resolveInputKind(
      input.input_kind,
      normalizedUrl,
      normalizedText,
    );

    if (inputKind === 'url' && !normalizedUrl) {
      throw new BadRequestException('url is required for url captures');
    }

    if (inputKind === 'text' && !normalizedText) {
      throw new BadRequestException('text is required for text captures');
    }

    if (input.input_kind === 'text' && normalizedUrl) {
      throw new BadRequestException(
        'text captures should not include url; omit input_kind or use input_kind=url',
      );
    }

    const importResult = await this.aiService.importRecipeFromCapture({
      url: inputKind === 'url' ? normalizedUrl : undefined,
      text: normalizedText,
    });
    const sourceKind = resolveSourceKind(
      inputKind,
      importResult.platform,
      normalizedUrl,
    );
    const resultKind = resolveResultKind(
      inputKind,
      sourceKind,
      normalizedText,
      importResult,
    );
    const missingInfo = buildMissingInfo(importResult);
    const confidence = resolveConfidence(resultKind, missingInfo, importResult);
    const status =
      missingInfo.length > 0 ? 'needs_more_info' : 'ready_for_review';
    const attribution = buildAttribution(
      importResult,
      inputKind,
      normalizedUrl,
    );
    const assumptions = buildAssumptions(importResult, resultKind);
    const shortSnippets = buildShortSnippets(
      normalizedText,
      importResult.source_description,
    );

    const capture = await this.prisma.capture.create({
      data: {
        userId,
        inputKind,
        sourceKind,
        resultKind,
        status,
        confidence,
        needsReview: true,
        sourceUrl: normalizedUrl,
        sourceTextSnippet: normalizedText?.slice(0, 1000),
        attribution: attribution as Prisma.InputJsonValue,
        recipePreview: importResult.imported_recipe as Prisma.InputJsonValue,
        assumptions: assumptions as Prisma.InputJsonValue,
        missingInfo: missingInfo as Prisma.InputJsonValue,
        nextActions: [
          'edit_draft',
          'save_as_recipe',
          'generate_cart_later',
          'discard',
        ] as Prisma.InputJsonValue,
        extractionNotes: importResult.extraction_notes as Prisma.InputJsonValue,
        shortSnippets: shortSnippets as Prisma.InputJsonValue,
      },
    });

    return mapCapture(capture);
  }

  async getCapture(userId: string, id: string): Promise<Capture> {
    const capture = await this.prisma.capture.findFirst({
      where: { id, userId },
    });

    if (!capture) {
      throw new NotFoundException(`Capture ${id} not found`);
    }

    return mapCapture(capture);
  }

  async saveCaptureAsRecipe(userId: string, id: string): Promise<BaseRecipe> {
    const capture = await this.prisma.capture.findFirst({
      where: { id, userId },
    });

    if (!capture) {
      throw new NotFoundException(`Capture ${id} not found`);
    }

    if (capture.savedRecipeId) {
      return this.recipeService.findOne(capture.savedRecipeId, userId);
    }

    if (capture.status === 'discarded' || capture.status === 'failed') {
      throw new BadRequestException(
        'Only reviewable captures can be saved as recipes',
      );
    }

    const preview = capture.recipePreview as CaptureRecipePreview | null;
    if (!preview) {
      throw new BadRequestException('Capture does not include a recipe draft');
    }

    const cuisineId = await this.resolveCuisineId(preview.cuisine);
    const recipe = await this.recipeService.create(
      buildRecipeInput(preview, cuisineId),
      userId,
    );

    await this.prisma.capture.update({
      where: { id: capture.id },
      data: {
        status: 'saved',
        savedRecipeId: recipe.id,
      },
    });

    return recipe;
  }

  supportedResultKinds() {
    return SUPPORTED_RESULT_KINDS;
  }

  private resolveInputKind(
    requested: CaptureInputKind | undefined,
    url: string | undefined,
    text: string | undefined,
  ): CaptureInputKind {
    if (requested) {
      return requested;
    }

    if (url) {
      return 'url';
    }

    if (text) {
      return 'text';
    }

    throw new BadRequestException('Provide a url or text capture input');
  }

  private async resolveCuisineId(label: string): Promise<string> {
    const cuisine =
      (await this.prisma.cuisine.findUnique({
        where: { slug: normalizeSlug(label) },
      })) ??
      (await this.prisma.cuisine.findUnique({
        where: { slug: 'other' },
      }));

    if (!cuisine) {
      throw new BadRequestException('Cuisine catalog is not seeded');
    }

    return cuisine.id;
  }
}

function buildRecipeInput(
  preview: CaptureRecipePreview,
  cuisineId: string,
): CreateRecipeDto {
  return {
    name: preview.name,
    cuisine_id: cuisineId,
    description: preview.description,
    nutrition_data: preview.nutrition_estimate ?? undefined,
    servings: preview.servings,
    ingredients: preview.ingredients.map((ingredient) => ({
      canonical_ingredient: ingredient.canonical_ingredient,
      amount: ingredient.amount,
      unit: ingredient.unit,
      display_ingredient: ingredient.display_ingredient,
      preparation: ingredient.preparation,
      optional: ingredient.optional,
      group: ingredient.group,
    })),
    steps: preview.steps.map((step) => ({
      step: step.step,
      what_to_do: step.what_to_do,
    })),
  };
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveSourceKind(
  inputKind: CaptureInputKind,
  platform: AiRecipeImportPlatform,
  url?: string,
): CaptureSourceKind {
  if (inputKind === 'text') {
    return 'pasted_text';
  }

  if (
    platform === 'youtube' ||
    platform === 'instagram' ||
    platform === 'tiktok'
  ) {
    return 'social_url';
  }

  return url ? 'recipe_url' : 'unknown';
}

function resolveResultKind(
  inputKind: CaptureInputKind,
  sourceKind: CaptureSourceKind,
  text: string | undefined,
  result: AiRecipeImportResult,
): CaptureResultKind {
  if (sourceKind === 'social_url') {
    return 'reconstructed_recipe';
  }

  if (inputKind === 'text' && looksLikeLooseIdea(text ?? '')) {
    return 'inspired_recipe';
  }

  if (
    result.extraction_notes.some((note) =>
      note.toLowerCase().includes('limited'),
    )
  ) {
    return 'partial_recipe_import';
  }

  return inputKind === 'url' ? 'exact_recipe_import' : 'partial_recipe_import';
}

function resolveConfidence(
  resultKind: CaptureResultKind,
  missingInfo: string[],
  result: AiRecipeImportResult,
): CaptureConfidence {
  if (missingInfo.length >= 2 || resultKind === 'inspired_recipe') {
    return 'low';
  }

  if (
    resultKind === 'partial_recipe_import' ||
    resultKind === 'reconstructed_recipe' ||
    result.extraction_notes.some((note) =>
      note.toLowerCase().includes('failed'),
    )
  ) {
    return 'medium';
  }

  return 'high';
}

function buildMissingInfo(result: AiRecipeImportResult): string[] {
  const missing: string[] = [];

  if (result.imported_recipe.ingredients.length === 0) {
    missing.push('ingredients');
  }

  if (result.imported_recipe.steps.length === 0) {
    missing.push('steps');
  }

  if (
    result.extraction_notes.some((note) =>
      /failed|limited|fallback/i.test(note),
    )
  ) {
    missing.push('verify source details');
  }

  return Array.from(new Set(missing));
}

function buildAttribution(
  result: AiRecipeImportResult,
  inputKind: CaptureInputKind,
  url?: string,
): CaptureSourceAttribution {
  const site = url ? safeHostname(url) : undefined;
  const title = result.source_title || undefined;
  const creator = result.source_creator ?? undefined;
  const attributionLabel =
    inputKind === 'text'
      ? 'Generated from pasted text'
      : [title, creator || site].filter(Boolean).join(' - ') ||
        'Imported source';

  return {
    url,
    title,
    creator,
    site,
    platform: inputKind === 'text' ? 'chef' : result.platform,
    attribution_label: attributionLabel,
  };
}

function buildAssumptions(
  result: AiRecipeImportResult,
  resultKind: CaptureResultKind,
): string[] {
  return Array.from(
    new Set(
      [
        ...result.imported_recipe.assumptions,
        'This is a user-reviewable draft, not a final recipe.',
        resultKind === 'reconstructed_recipe'
          ? 'Some quantities or timings may be inferred from incomplete source content.'
          : '',
        resultKind === 'inspired_recipe'
          ? 'Chef generated a cookable version inspired by the pasted input.'
          : '',
      ].filter(Boolean),
    ),
  );
}

function buildShortSnippets(text: string | undefined, description: string) {
  return [text?.slice(0, 500), description.slice(0, 300)].filter(
    (snippet): snippet is string => Boolean(snippet?.trim()),
  );
}

function looksLikeLooseIdea(text: string) {
  return !/(ingredient|ingredients|directions|instructions|steps?|serves|cook|bake)/i.test(
    text,
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
