import { Injectable } from '@nestjs/common';
import type { AiProvider } from './ai.provider';
import type {
  AiChatResult,
  AiIngredientSwapResult,
  AiMealGenerationResult,
  AiRecipeImportPlatform,
  AiRecipeImportResult,
} from './ai.types';
import type { AiChatDto } from './dto/chat.dto';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { ImportRecipeDto } from './dto/import-recipe.dto';
import type { SwapIngredientDto } from './dto/swap-ingredient.dto';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiAiProvider } from './providers/openai-ai.provider';

@Injectable()
export class AiService {
  constructor(
    private readonly mockProvider: MockAiProvider,
    private readonly openAiProvider: OpenAiAiProvider,
  ) {}

  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult> {
    return this.provider.generateMeals({
      ...input,
      servings_per_meal: input.servings_per_meal ?? 4,
      meals_needed: input.meals_needed ?? 1,
      dietary_preferences: input.dietary_preferences ?? [],
      allergies: input.allergies ?? [],
      disliked_ingredients: input.disliked_ingredients ?? [],
      inventory: input.inventory ?? [],
      budget_mode: input.budget_mode ?? 'balanced',
      meal_style: input.meal_style ?? 'standard',
      quality_goals: input.quality_goals ?? [],
      notes: input.notes ?? '',
    });
  }

  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult> {
    return this.provider.swapIngredient({
      ...input,
      dietary_preferences: input.dietary_preferences ?? [],
      inventory: input.inventory ?? [],
      budget_mode: input.budget_mode ?? 'balanced',
      notes: input.notes ?? '',
    });
  }

  async importRecipe(input: ImportRecipeDto): Promise<AiRecipeImportResult> {
    const extracted = await extractRecipeSource(
      input.url,
      input.supplemental_text ?? '',
    );

    return this.provider.importRecipe({
      request: input,
      platform: extracted.platform,
      source_title: extracted.sourceTitle,
      source_creator: extracted.sourceCreator,
      source_description: extracted.sourceDescription,
      extracted_text: extracted.extractedText,
      extraction_notes: extracted.extractionNotes,
    });
  }

  chat(input: AiChatDto): Promise<AiChatResult> {
    return this.provider.chat({
      message: input.message,
      history: input.history ?? [],
      context: input.context,
    });
  }

  getProviderName() {
    return this.provider.name;
  }

  private get provider(): AiProvider {
    const requestedProvider = (
      process.env.CHEF_LLM_PROVIDER ?? 'mock'
    ).toLowerCase();

    if (requestedProvider === 'openai') {
      return this.openAiProvider;
    }

    return this.mockProvider;
  }
}

async function extractRecipeSource(url: string, supplementalText: string) {
  const extractionNotes: string[] = [];
  const platform = detectPlatform(url);
  let sourceTitle = deriveTitleFromUrl(url);
  let sourceDescription = '';
  let sourceCreator: string | null = null;
  let extractedText = supplementalText.trim();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const html = await response.text();
      const metadata = extractMetadata(html);
      sourceTitle = metadata.title || sourceTitle;
      sourceDescription = metadata.description;
      sourceCreator = metadata.creator;

      const textContent = extractReadableText(html);
      if (textContent) {
        extractedText = [extractedText, textContent]
          .filter(Boolean)
          .join('\n\n');
        extractionNotes.push(
          'Fetched source page HTML and extracted readable text.',
        );
      } else {
        extractionNotes.push(
          'Fetched source page HTML but found limited readable body text.',
        );
      }
    } else {
      extractionNotes.push(`Source fetch returned HTTP ${response.status}.`);
    }
  } catch {
    extractionNotes.push(
      'Source fetch failed, so Chef will rely on metadata heuristics and any pasted text.',
    );
  }

  if (!sourceDescription && supplementalText.trim()) {
    sourceDescription = supplementalText.trim().slice(0, 280);
  }

  if (!extractedText.trim()) {
    extractedText = [sourceTitle, sourceDescription]
      .filter(Boolean)
      .join('\n\n');
    extractionNotes.push(
      'Built extraction text from title/description fallback.',
    );
  }

  if (supplementalText.trim()) {
    extractionNotes.push(
      'Included pasted supplemental source text from the user.',
    );
  }

  return {
    platform,
    sourceTitle,
    sourceCreator,
    sourceDescription,
    extractedText: extractedText.slice(0, 12000),
    extractionNotes,
  };
}

function detectPlatform(url: string): AiRecipeImportPlatform {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  return 'generic';
}

function deriveTitleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const lastPart = parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
    return (
      toTitleCase(lastPart.replace(/[-_]+/g, ' ').trim()) || 'Imported recipe'
    );
  } catch {
    return 'Imported recipe';
  }
}

function extractMetadata(html: string) {
  const normalized = html.replace(/\r/g, '');
  const title =
    findMetaContent(normalized, 'property', 'og:title') ||
    findMetaContent(normalized, 'name', 'twitter:title') ||
    findTitleTag(normalized) ||
    '';
  const description =
    findMetaContent(normalized, 'property', 'og:description') ||
    findMetaContent(normalized, 'name', 'description') ||
    findMetaContent(normalized, 'name', 'twitter:description') ||
    '';
  const creator =
    findMetaContent(normalized, 'name', 'author') ||
    findMetaContent(normalized, 'property', 'article:author') ||
    findJsonLdCreator(normalized);

  return {
    title: decodeHtmlEntities(cleanWhitespace(title)),
    description: decodeHtmlEntities(cleanWhitespace(description)),
    creator: creator ? decodeHtmlEntities(cleanWhitespace(creator)) : null,
  };
}

function findMetaContent(html: string, attr: 'name' | 'property', key: string) {
  const pattern = new RegExp(
    `<meta[^>]*${attr}=["']${escapeRegExp(key)}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const reversePattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${escapeRegExp(key)}["'][^>]*>`,
    'i',
  );

  return html.match(pattern)?.[1] ?? html.match(reversePattern)?.[1] ?? '';
}

function findTitleTag(html: string) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
}

function findJsonLdCreator(html: string) {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as
        | Record<string, unknown>
        | Array<Record<string, unknown>>;
      const objects = Array.isArray(parsed) ? parsed : [parsed];
      for (const obj of objects) {
        const author = obj.author;
        if (typeof author === 'string') return author;
        if (
          author &&
          typeof author === 'object' &&
          'name' in author &&
          typeof author.name === 'string'
        ) {
          return author.name;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return '';
}

function extractReadableText(html: string) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  const cleaned = decodeHtmlEntities(cleanWhitespace(stripped));
  return cleaned.slice(0, 6000);
}

function cleanWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}
