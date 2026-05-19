import { Injectable } from '@nestjs/common';
import type { AiProvider } from './ai.provider';
import type {
  AiChatResult,
  AiIngredientSwapResult,
  AiInventoryStructureResult,
  AiMealGenerationResult,
  AiRecipeImportPlatform,
  AiRecipeImportResult,
} from './ai.types';
import type { AiChatDto } from './dto/chat.dto';
import type { GenerateMealsDto } from './dto/generate-meals.dto';
import type { ImportRecipeDto } from './dto/import-recipe.dto';
import type { StructureInventoryDto } from './dto/structure-inventory.dto';
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
      source_image_url: extracted.sourceImageUrl,
      extracted_text: extracted.extractedText,
      extraction_notes: extracted.extractionNotes,
    });
  }

  async importRecipeFromCapture(input: {
    url?: string;
    text?: string;
  }): Promise<AiRecipeImportResult> {
    const supplementalText = input.text?.trim() ?? '';

    if (input.url) {
      const extracted = await extractRecipeSource(input.url, supplementalText);

      return this.provider.importRecipe({
        request: {
          url: input.url,
          supplemental_text: supplementalText || undefined,
        },
        platform: extracted.platform,
        source_title: extracted.sourceTitle,
        source_creator: extracted.sourceCreator,
        source_description: extracted.sourceDescription,
        source_image_url: extracted.sourceImageUrl,
        extracted_text: extracted.extractedText,
        extraction_notes: extracted.extractionNotes,
      });
    }

    const sourceTitle = deriveTitleFromText(supplementalText);
    const sourceDescription = supplementalText.slice(0, 280);

    return this.provider.importRecipe({
      request: {
        url: 'chef-capture://pasted-text',
        supplemental_text: supplementalText,
      },
      platform: 'generic',
      source_title: sourceTitle,
      source_creator: null,
      source_description: sourceDescription,
      source_image_url: null,
      extracted_text: supplementalText.slice(0, 12000),
      extraction_notes: [
        'Structured from pasted user text. No external source was fetched.',
      ],
    });
  }

  chat(input: AiChatDto): Promise<AiChatResult> {
    return this.provider.chat({
      message: input.message,
      history: input.history ?? [],
      context: input.context,
    });
  }

  structureInventory(
    input: StructureInventoryDto,
  ): Promise<AiInventoryStructureResult> {
    return this.provider.structureInventory({
      ...input,
      transcript: input.transcript.trim(),
      allowed_units: input.allowed_units ?? [],
      inventory: input.inventory ?? [],
      source: input.source ?? 'voice_inventory',
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
  let sourceImageUrl: string | null = null;
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
      sourceImageUrl =
        metadata.imageUrl || findInstagramScriptImage(html) || sourceImageUrl;
      sourceCreator = metadata.creator;

      const textContent =
        platform === 'instagram'
          ? appendUniqueText(
              extractReadableText(html),
              findInstagramScriptCaption(html),
            )
          : extractReadableText(html);
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

  if (platform === 'instagram') {
    const instagramApi = await fetchInstagramApiSource(url);
    if (instagramApi) {
      sourceTitle = chooseUsefulText(sourceTitle, instagramApi.title);
      sourceDescription = chooseUsefulText(
        sourceDescription,
        instagramApi.description,
      );
      sourceCreator = instagramApi.creator ?? sourceCreator;
      sourceImageUrl = instagramApi.imageUrl ?? sourceImageUrl;

      if (instagramApi.text) {
        extractedText = appendUniqueText(extractedText, instagramApi.text);
      }

      extractionNotes.push(
        'Fetched Instagram shortcode metadata from the public web API.',
      );
    } else {
      extractionNotes.push(
        'Instagram shortcode public web API was unavailable.',
      );
    }

    const instagramPageJson = await fetchInstagramPageJsonSource(url);
    if (instagramPageJson) {
      sourceTitle = chooseUsefulText(sourceTitle, instagramPageJson.title);
      sourceDescription = chooseUsefulText(
        sourceDescription,
        instagramPageJson.description,
      );
      sourceCreator = instagramPageJson.creator ?? sourceCreator;
      sourceImageUrl = instagramPageJson.imageUrl ?? sourceImageUrl;

      if (instagramPageJson.text) {
        extractedText = appendUniqueText(extractedText, instagramPageJson.text);
      }

      extractionNotes.push(
        'Fetched Instagram post JSON metadata from the public page endpoint.',
      );
    } else {
      extractionNotes.push(
        'Instagram public page JSON endpoint was unavailable.',
      );
    }

    const instagramEmbed = await fetchInstagramEmbedSource(url);
    if (instagramEmbed) {
      sourceTitle = chooseUsefulText(sourceTitle, instagramEmbed.title);
      sourceDescription = chooseUsefulText(
        sourceDescription,
        instagramEmbed.description,
      );
      sourceCreator = instagramEmbed.creator ?? sourceCreator;
      sourceImageUrl = instagramEmbed.imageUrl ?? sourceImageUrl;

      if (instagramEmbed.text) {
        extractedText = appendUniqueText(extractedText, instagramEmbed.text);
        extractionNotes.push(
          'Fetched Instagram embed caption text for recipe extraction.',
        );
      } else {
        extractionNotes.push(
          'Instagram embed returned metadata but no recipe-like caption text.',
        );
      }
    } else {
      extractionNotes.push(
        'Instagram public caption embed was unavailable; Chef may need pasted caption text for this source.',
      );
    }
  }

  if (!sourceImageUrl) {
    const oembed = await fetchOEmbedMetadata(url, platform);
    if (oembed) {
      sourceTitle = oembed.title || sourceTitle;
      sourceCreator = oembed.creator ?? sourceCreator;
      sourceImageUrl = oembed.imageUrl ?? sourceImageUrl;
      if (oembed.description && !sourceDescription) {
        sourceDescription = oembed.description;
      }
      extractionNotes.push(
        `Fetched ${platform} oEmbed metadata for source attribution and thumbnail.`,
      );
    }
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
    sourceImageUrl,
    extractedText: extractedText.slice(0, 12000),
    extractionNotes,
  };
}

async function fetchInstagramEmbedSource(url: string) {
  const embedUrl = buildInstagramEmbedUrl(url);
  if (!embedUrl) return null;

  for (const candidateUrl of embedUrl) {
    try {
      const response = await fetch(candidateUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const metadata = extractMetadata(html);
      const text = extractReadableText(html);
      const scriptCaption = findInstagramScriptCaption(html);
      const captionText = appendUniqueText(
        extractInstagramCaptionText(html, text),
        scriptCaption,
      );
      const scriptImageUrl = findInstagramScriptImage(html);
      if (
        metadata.title ||
        metadata.description ||
        metadata.imageUrl ||
        scriptImageUrl ||
        captionText
      ) {
        return {
          title: metadata.title,
          description: metadata.description,
          creator: metadata.creator,
          imageUrl: metadata.imageUrl ?? scriptImageUrl,
          text: captionText,
        };
      }
    } catch {
      // Try the next Instagram embed form.
    }
  }

  return null;
}

async function fetchInstagramPageJsonSource(url: string) {
  const pageJsonUrl = buildInstagramPageJsonUrl(url);
  if (!pageJsonUrl) return null;

  try {
    const response = await fetch(pageJsonUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: url,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const captions = findInstagramJsonStrings(payload, [
      'text',
      'caption',
      'accessibility_caption',
      'alt',
    ])
      .map((value) => decodeHtmlEntities(cleanWhitespace(value)))
      .filter(isUsefulInstagramExtraction)
      .sort((a, b) => b.length - a.length);
    const imageUrl = findInstagramJsonStrings(payload, [
      'display_url',
      'thumbnail_src',
      'thumbnail_url',
      'url',
    ]).find((value) => /^https?:\/\//i.test(value));
    const creator = findInstagramJsonStrings(payload, [
      'username',
      'full_name',
    ]).find(Boolean);
    const caption = captions.at(0) ?? '';

    if (!caption && !imageUrl && !creator) return null;

    return {
      title: caption ? deriveTitleFromText(caption) : '',
      description: caption.slice(0, 280),
      creator: creator ?? null,
      imageUrl: imageUrl ?? null,
      text: caption,
    };
  } catch {
    return null;
  }
}

function buildInstagramPageJsonUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'instagram.com') return null;

    const [kind, shortcode] = parsed.pathname.split('/').filter(Boolean);
    if (!['p', 'reel', 'tv'].includes(kind) || !shortcode) return null;

    return `https://www.instagram.com/${kind}/${shortcode}/?__a=1&__d=dis`;
  } catch {
    return null;
  }
}

async function fetchInstagramApiSource(url: string) {
  const shortcode = extractInstagramShortcode(url);
  if (!shortcode) return null;

  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/media/shortcode/${encodeURIComponent(shortcode)}/info/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: `https://www.instagram.com/reel/${shortcode}/`,
          'X-ASBD-ID': '129477',
          'X-IG-App-ID': '936619743392459',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as Record<string, unknown>;
    const item = readInstagramApiItem(payload);
    if (!item) return null;

    const caption = readInstagramApiCaption(item);
    const creator = readInstagramApiCreator(item);
    const imageUrl = readInstagramApiImageUrl(item);
    const title = caption ? deriveTitleFromText(caption) : '';

    if (!caption && !imageUrl && !creator) return null;

    return {
      title,
      description: caption.slice(0, 280),
      creator,
      imageUrl,
      text: caption,
    };
  } catch {
    return null;
  }
}

function extractInstagramShortcode(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'instagram.com') return null;

    const [kind, shortcode] = parsed.pathname.split('/').filter(Boolean);
    if (!['p', 'reel', 'tv'].includes(kind) || !shortcode) return null;
    return shortcode;
  } catch {
    return null;
  }
}

function readInstagramApiItem(payload: Record<string, unknown>) {
  const items = payload.items;
  if (Array.isArray(items) && isRecord(items[0])) return items[0];
  const item = payload.item;
  return isRecord(item) ? item : null;
}

function readInstagramApiCaption(item: Record<string, unknown>) {
  const caption = item.caption;
  if (isRecord(caption) && typeof caption.text === 'string') {
    return decodeHtmlEntities(cleanWhitespace(caption.text));
  }
  if (typeof caption === 'string') {
    return decodeHtmlEntities(cleanWhitespace(caption));
  }
  return '';
}

function readInstagramApiCreator(item: Record<string, unknown>) {
  const user = item.user;
  if (!isRecord(user)) return null;
  return readString(user.full_name) ?? readString(user.username);
}

function readInstagramApiImageUrl(item: Record<string, unknown>) {
  const imageVersions = item.image_versions2;
  if (isRecord(imageVersions)) {
    const candidates = imageVersions.candidates;
    if (Array.isArray(candidates)) {
      for (const candidate of candidates) {
        if (isRecord(candidate) && typeof candidate.url === 'string') {
          return candidate.url;
        }
      }
    }
  }

  if (typeof item.display_url === 'string') return item.display_url;
  if (typeof item.thumbnail_url === 'string') return item.thumbnail_url;
  return null;
}

function findInstagramScriptCaption(html: string) {
  const jsonCandidates = extractJsonObjectsFromHtml(html).flatMap((value) =>
    findInstagramJsonStrings(value, [
      'text',
      'caption',
      'accessibility_caption',
      'edge_media_to_caption',
      'alt',
    ]),
  );
  const candidates = [
    ...matchJsonStringValues(html, 'text'),
    ...matchJsonStringValues(html, 'caption'),
    ...matchJsonStringValues(html, 'accessibility_caption'),
    ...matchJsonStringValues(html, 'edge_media_to_caption'),
    ...jsonCandidates,
  ]
    .map((value) => decodeHtmlEntities(cleanWhitespace(value)))
    .filter(isUsefulInstagramExtraction)
    .sort((a, b) => b.length - a.length);

  return candidates.at(0)?.slice(0, 6000) ?? '';
}

function findInstagramScriptImage(html: string) {
  const jsonCandidates = extractJsonObjectsFromHtml(html).flatMap((value) =>
    findInstagramJsonStrings(value, [
      'display_url',
      'thumbnail_src',
      'thumbnail_url',
      'profile_pic_url',
      'url',
    ]),
  );
  const candidates = [
    ...matchJsonStringValues(html, 'display_url'),
    ...matchJsonStringValues(html, 'thumbnail_src'),
    ...matchJsonStringValues(html, 'thumbnail_url'),
    ...matchJsonStringValues(html, 'profile_pic_url'),
    ...jsonCandidates,
  ]
    .map((value) => decodeHtmlEntities(cleanWhitespace(value)))
    .filter((value) => /^https?:\/\//i.test(value));

  return candidates.at(0) ?? null;
}

function extractJsonObjectsFromHtml(html: string) {
  const values: unknown[] = [];
  const scripts = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;

    const jsonLike = raw
      .replace(/^window\._sharedData\s*=\s*/, '')
      .replace(/^window\.__additionalDataLoaded\([^,]+,\s*/, '')
      .replace(/\);?\s*$/, '')
      .replace(/;\s*$/, '');

    if (!jsonLike.startsWith('{') && !jsonLike.startsWith('[')) continue;

    try {
      values.push(JSON.parse(jsonLike));
    } catch {
      // Ignore non-JSON scripts.
    }
  }

  return values;
}

function findInstagramJsonStrings(input: unknown, keys: string[]) {
  const values: string[] = [];
  const keySet = new Set(keys);

  function visit(value: unknown) {
    if (typeof value === 'string') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;

    for (const [key, child] of Object.entries(value)) {
      if (keySet.has(key) && typeof child === 'string') {
        values.push(child);
      }
      if (keySet.has(key) && isRecord(child)) {
        values.push(...findInstagramJsonStrings(child, keys));
      }
      visit(child);
    }
  }

  visit(input);
  return values;
}

function matchJsonStringValues(html: string, key: string) {
  const plainPattern = new RegExp(
    `"${escapeRegExp(key)}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'gi',
  );
  const escapedPattern = new RegExp(
    `\\\\"${escapeRegExp(key)}\\\\"\\s*:\\s*\\\\"((?:\\\\\\\\.|[^"\\\\])*)\\\\"`,
    'gi',
  );

  return [
    ...readJsonStringMatches(html, plainPattern),
    ...readJsonStringMatches(html, escapedPattern),
  ];
}

function readJsonStringMatches(html: string, pattern: RegExp) {
  const values: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) continue;
    values.push(decodeJsonStringFragment(raw));
  }
  return values;
}

function decodeJsonStringFragment(input: string) {
  try {
    return JSON.parse(`"${input.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return input
      .replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
        String.fromCharCode(Number.parseInt(code, 16)),
      )
      .replace(/\\\//g, '/')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n');
  }
}

function buildInstagramEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'instagram.com') return null;

    const [kind, shortcode] = parsed.pathname.split('/').filter(Boolean);
    if (!['p', 'reel', 'tv'].includes(kind) || !shortcode) return null;

    const base = `https://www.instagram.com/${kind}/${shortcode}/embed`;
    return [`${base}/captioned/`, `${base}/`];
  } catch {
    return null;
  }
}

function extractInstagramCaptionText(html: string, fallbackText: string) {
  const candidates = [
    findMetaContent(html, 'property', 'og:description'),
    findMetaContent(html, 'name', 'description'),
    findMetaContent(html, 'property', 'og:title'),
    fallbackText,
  ]
    .map((value) => decodeHtmlEntities(cleanWhitespace(value)))
    .filter(isUsefulInstagramExtraction);

  return candidates.at(0)?.slice(0, 6000) ?? '';
}

function isUsefulInstagramExtraction(input: string) {
  const normalized = input.toLowerCase();
  return (
    input.length > 40 &&
    normalized !== 'instagram' &&
    !normalized.includes('log in to instagram') &&
    !normalized.includes('sign up to see photos') &&
    !normalized.includes('create an account or log in')
  );
}

function chooseUsefulText(current: string, next: string | null) {
  if (!next) return current;
  if (!current || current.toLowerCase() === 'instagram') return next;
  if (
    next.length > current.length &&
    !next.toLowerCase().includes('instagram')
  ) {
    return next;
  }
  return current;
}

function appendUniqueText(current: string, next: string) {
  const trimmedCurrent = current.trim();
  const trimmedNext = next.trim();
  if (!trimmedCurrent) return trimmedNext;
  if (!trimmedNext) return trimmedCurrent;
  if (trimmedCurrent.includes(trimmedNext)) return trimmedCurrent;
  if (trimmedNext.includes(trimmedCurrent)) return trimmedNext;
  return `${trimmedCurrent}\n\n${trimmedNext}`;
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

function deriveTitleFromText(text: string) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine?.slice(0, 80) || 'Captured cooking idea';
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
  const imageUrl =
    findMetaContent(normalized, 'property', 'og:image') ||
    findMetaContent(normalized, 'property', 'og:image:url') ||
    findMetaContent(normalized, 'name', 'twitter:image') ||
    findMetaContent(normalized, 'name', 'twitter:image:src') ||
    findJsonLdImage(normalized);

  return {
    title: decodeHtmlEntities(cleanWhitespace(title)),
    description: decodeHtmlEntities(cleanWhitespace(description)),
    creator: creator ? decodeHtmlEntities(cleanWhitespace(creator)) : null,
    imageUrl: imageUrl ? decodeHtmlEntities(cleanWhitespace(imageUrl)) : null,
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

function findJsonLdImage(html: string) {
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
      for (const obj of objects.flatMap(flattenJsonLdGraph)) {
        const image = obj.image;
        const url = readJsonLdImageUrl(image);
        if (url) return url;
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return '';
}

function flattenJsonLdGraph(obj: Record<string, unknown>) {
  const graph = obj['@graph'];
  return Array.isArray(graph) ? [obj, ...graph.filter(isRecord)] : [obj];
}

function readJsonLdImageUrl(input: unknown): string {
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) {
    for (const value of input) {
      const url = readJsonLdImageUrl(value);
      if (url) return url;
    }
  }
  if (isRecord(input)) {
    if (typeof input.url === 'string') return input.url;
    if (typeof input.contentUrl === 'string') return input.contentUrl;
  }
  return '';
}

async function fetchOEmbedMetadata(
  url: string,
  platform: AiRecipeImportPlatform,
) {
  const endpoint = buildOEmbedUrl(url, platform);
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Record<string, unknown>;
    return {
      title: readString(payload.title),
      creator: readString(payload.author_name),
      description: readString(payload.description),
      imageUrl: readString(payload.thumbnail_url),
    };
  } catch {
    return null;
  }
}

function buildOEmbedUrl(url: string, platform: AiRecipeImportPlatform) {
  if (platform === 'youtube') {
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  if (platform === 'tiktok') {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  }
  return null;
}

function readString(input: unknown) {
  return typeof input === 'string' && input.trim() ? input.trim() : null;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
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
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
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
