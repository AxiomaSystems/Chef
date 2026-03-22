import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { ProductCandidate } from '@cart/shared';
import {
  KROGER_API_BASE_URL,
  KROGER_CLIENT_ID,
  KROGER_CLIENT_SECRET,
  KROGER_TOKEN_URL,
  KROGER_USE_REAL_PROVIDER,
} from './matching.constants';
import { parseProductSize } from './product-size';
import type {
  RetailerProductProvider,
  RetailerSearchContext,
} from './retailer-product-provider';

type KrogerTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type KrogerLocationRecord = Record<string, unknown>;
type KrogerProductRecord = Record<string, unknown>;

@Injectable()
export class KrogerRetailerProductProvider implements RetailerProductProvider {
  readonly retailer = 'kroger' as const;
  private readonly logger = new Logger(KrogerRetailerProductProvider.name);
  private cachedAccessToken?: string;
  private accessTokenExpiresAt?: number;
  private readonly locationCache = new Map<
    string,
    { expiresAt: number; locationId?: string }
  >();
  private readonly queryCache = new Map<
    string,
    { expiresAt: number; candidates: ProductCandidate[] }
  >();

  isEnabled() {
    return Boolean(
      KROGER_USE_REAL_PROVIDER && KROGER_CLIENT_ID && KROGER_CLIENT_SECRET,
    );
  }

  async findCandidatesForIngredient(
    canonicalIngredient: string,
    context?: RetailerSearchContext,
  ) {
    return this.searchProducts(canonicalIngredient, context);
  }

  async searchProducts(
    query: string,
    context?: RetailerSearchContext,
  ): Promise<ProductCandidate[]> {
    const normalizedQuery = query.trim();
    const zipCode = context?.zipCode?.trim();
    const preferredLocationId = context?.locationId?.trim();

    if (!normalizedQuery || !zipCode || !this.isEnabled()) {
      this.logger.log(
        `Kroger search skipped query="${normalizedQuery}" zip="${zipCode ?? ''}" enabled=${this.isEnabled()}`,
      );
      return [];
    }

    const cacheKey = `${zipCode}:${normalizedQuery.toLowerCase()}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.candidates;
    }

    try {
      const token = await this.getAccessToken();
      const locationId =
        preferredLocationId || (await this.resolveLocationId(zipCode, token));

      this.logger.log(
        `Kroger search start query="${normalizedQuery}" zip="${zipCode}" locationId="${locationId ?? ''}"`,
      );

      if (!locationId) {
        this.logger.warn(
          `Kroger search aborted because no locationId was resolved for zip "${zipCode}"`,
        );
        throw new BadRequestException(
          `No Kroger location found near ${zipCode}. Try another shopping location.`,
        );
      }

      const url = new URL('products', KROGER_API_BASE_URL);
      url.searchParams.set('filter.term', normalizedQuery);
      url.searchParams.set('filter.locationId', locationId);
      url.searchParams.set('filter.limit', '12');

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Kroger search failed with ${response.status} for query "${normalizedQuery}"`,
        );
        return [];
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const candidates = this.mapSearchPayload(payload).slice(0, 12);

      this.logger.log(
        `Kroger search success query="${normalizedQuery}" locationId="${locationId}" candidates=${candidates.length}`,
      );
      if (candidates[0]) {
        this.logger.log(
          `Kroger first candidate query="${normalizedQuery}" productId="${candidates[0].product_id}" title="${candidates[0].title}" price=${candidates[0].price}`,
        );
      }

      this.queryCache.set(cacheKey, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        candidates,
      });
      return candidates;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown Kroger search error';
      this.logger.warn(`Kroger search failed: ${message}`);
      return [];
    }
  }

  private async getAccessToken() {
    if (
      this.cachedAccessToken &&
      this.accessTokenExpiresAt &&
      this.accessTokenExpiresAt > Date.now() + 30_000
    ) {
      return this.cachedAccessToken;
    }

    const credentials = Buffer.from(
      `${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`,
    ).toString('base64');

    const response = await fetch(KROGER_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Cussien/0.1 (+https://cussien.com)',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'product.compact',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(
        `Kroger token request failed status=${response.status} body=${errorText.slice(0, 400)}`,
      );
      throw new Error(`Token request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as KrogerTokenResponse;
    if (!payload.access_token) {
      throw new Error('Token response did not include access_token');
    }

    this.logger.log('Kroger token request succeeded');

    const expiresInMs = Math.max((payload.expires_in ?? 1800) - 60, 60) * 1000;
    this.cachedAccessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + expiresInMs;
    return payload.access_token;
  }

  private async resolveLocationId(zipCode: string, token: string) {
    const cached = this.locationCache.get(zipCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.locationId;
    }

    const url = new URL('locations', KROGER_API_BASE_URL);
    url.searchParams.set('filter.zipCode.near', zipCode);
    url.searchParams.set('filter.limit', '1');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Cussien/0.1 (+https://cussien.com)',
        Origin: 'https://cussien.com',
        Referer: 'https://cussien.com/',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(
        `Kroger location lookup failed with ${response.status} for zip "${zipCode}" body=${errorText.slice(0, 400)}`,
      );
      return undefined;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const firstLocation = this.extractLocations(payload)[0];
    const locationId = this.readString(
      firstLocation?.locationId,
      firstLocation?.id,
    );

    this.locationCache.set(zipCode, {
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      locationId,
    });

    this.logger.log(
      `Kroger location resolved zip="${zipCode}" locationId="${locationId ?? ''}"`,
    );

    return locationId;
  }

  private extractLocations(payload: Record<string, unknown>) {
    if (Array.isArray(payload.data)) {
      return payload.data.filter(
        (item): item is KrogerLocationRecord =>
          typeof item === 'object' && item !== null,
      );
    }

    return [];
  }

  private mapSearchPayload(payload: Record<string, unknown>): ProductCandidate[] {
    const rawItems = this.extractProducts(payload);

    return rawItems
      .map((item, index) => this.mapSearchItem(item, index))
      .filter((candidate): candidate is ProductCandidate => candidate !== null);
  }

  private extractProducts(payload: Record<string, unknown>) {
    if (Array.isArray(payload.data)) {
      return payload.data.filter(
        (item): item is KrogerProductRecord =>
          typeof item === 'object' && item !== null,
      );
    }

    return [];
  }

  private mapSearchItem(
    item: KrogerProductRecord,
    index: number,
  ): ProductCandidate | null {
    const firstItem = this.readFirstRecord(item.items);
    const title = this.readString(item.description, item.name, firstItem?.description);
    const productId = this.readString(
      firstItem?.itemId,
      item.productId,
      item.id,
    );
    const price = this.readNumber(
      this.readNested(firstItem, ['price', 'promo']),
      this.readNested(firstItem, ['price', 'regular']),
      firstItem?.price,
    );

    if (!title || !productId || price === null) {
      return null;
    }

    const parsedSize = parseProductSize(
      this.readString(this.readNested(firstItem, ['size'])),
      this.readString(item.size),
      title,
    );

    return {
      product_id: productId || `kroger-${index}`,
      title,
      brand: this.readString(item.brand, firstItem?.brand),
      price,
      size_value: parsedSize.sizeValue,
      size_unit: parsedSize.sizeUnit,
      quantity_text:
        parsedSize.quantityText ??
        this.readString(
          this.readNested(firstItem, ['size']),
          this.readNested(firstItem, ['soldBy']),
          item.size,
        ),
      url: this.readString(item.productPageURI, item.productPageURL, item.url),
      image_url: this.readImageUrl(item.images),
    } satisfies ProductCandidate;
  }

  private readFirstRecord(value: unknown) {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const first = value.find(
      (item) => typeof item === 'object' && item !== null,
    );

    return first as Record<string, unknown> | undefined;
  }

  private readImageUrl(images: unknown) {
    if (!Array.isArray(images)) {
      return undefined;
    }

    for (const image of images) {
      if (typeof image !== 'object' || image === null) {
        continue;
      }

      const sizes = (image as Record<string, unknown>).sizes;
      if (!Array.isArray(sizes)) {
        continue;
      }

      const withUrl = sizes.find(
        (size) =>
          typeof size === 'object' &&
          size !== null &&
          typeof (size as Record<string, unknown>).url === 'string',
      ) as Record<string, unknown> | undefined;

      if (withUrl?.url && typeof withUrl.url === 'string') {
        return withUrl.url;
      }
    }

    return undefined;
  }

  private readNested(
    record: Record<string, unknown> | undefined,
    path: string[],
  ): unknown {
    let current: unknown = record;

    for (const key of path) {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private readString(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private readNumber(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = Number(value.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(normalized)) {
          return normalized;
        }
      }
    }

    return null;
  }
}
