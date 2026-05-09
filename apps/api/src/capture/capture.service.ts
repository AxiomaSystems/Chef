import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Capture,
  CaptureConfidence,
  CaptureInputKind,
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
