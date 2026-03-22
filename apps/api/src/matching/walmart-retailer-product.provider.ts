import { Injectable, Logger } from '@nestjs/common';
import type { ProductCandidate } from '@cart/shared';
import {
  WALMART_API_BASE_URL,
  WALMART_CLIENT_ID,
  WALMART_CLIENT_SECRET,
  WALMART_USE_REAL_PROVIDER,
} from './matching.constants';
import type { RetailerProductProvider } from './retailer-product-provider';

type WalmartTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type WalmartSearchItem = Record<string, unknown>;

@Injectable()
export class WalmartRetailerProductProvider implements RetailerProductProvider {
  readonly retailer = 'walmart' as const;

  private readonly logger = new Logger(WalmartRetailerProductProvider.name);
  private cachedAccessToken?: string;
  private accessTokenExpiresAt?: number;
  private readonly queryCache = new Map<
    string,
    { expiresAt: number; candidates: ProductCandidate[] }
  >();

  isEnabled() {
    return Boolean(
      WALMART_USE_REAL_PROVIDER && WALMART_CLIENT_ID && WALMART_CLIENT_SECRET,
    );
  }

  async findCandidatesForIngredient(canonicalIngredient: string) {
    return this.searchProducts(canonicalIngredient);
  }

  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !this.isEnabled()) {
      return [];
    }

    const cached = this.queryCache.get(normalizedQuery.toLowerCase());
    if (cached && cached.expiresAt > Date.now()) {
      return cached.candidates;
    }

    try {
      const token = await this.getAccessToken();
      const url = new URL('/v3/items/walmart/search', WALMART_API_BASE_URL);
      url.searchParams.set('query', normalizedQuery);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Walmart search failed with ${response.status} for query "${normalizedQuery}"`,
        );
        return [];
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const candidates = this.mapSearchPayload(payload).slice(0, 12);

      this.queryCache.set(normalizedQuery.toLowerCase(), {
        expiresAt: Date.now() + 5 * 60 * 1000,
        candidates,
      });

      return candidates;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Walmart search error';
      this.logger.warn(`Walmart search failed: ${message}`);
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
      `${WALMART_CLIENT_ID}:${WALMART_CLIENT_SECRET}`,
    ).toString('base64');

    const response = await fetch(`${WALMART_API_BASE_URL}/v3/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as WalmartTokenResponse;

    if (!payload.access_token) {
      throw new Error('Token response did not include access_token');
    }

    const expiresInMs = Math.max((payload.expires_in ?? 900) - 60, 60) * 1000;
    this.cachedAccessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + expiresInMs;
    return payload.access_token;
  }

  private mapSearchPayload(payload: Record<string, unknown>): ProductCandidate[] {
    const rawItems = this.extractSearchItems(payload);

    return rawItems
      .map((item, index) => this.mapSearchItem(item, index))
      .filter((candidate): candidate is ProductCandidate => candidate !== null);
  }

  private extractSearchItems(payload: Record<string, unknown>) {
    if (Array.isArray(payload.items)) {
      return payload.items.filter(
        (item): item is WalmartSearchItem =>
          typeof item === 'object' && item !== null,
      );
    }

    if (
      typeof payload.data === 'object' &&
      payload.data !== null &&
      Array.isArray((payload.data as Record<string, unknown>).items)
    ) {
      return ((payload.data as Record<string, unknown>).items as unknown[]).filter(
        (item): item is WalmartSearchItem =>
          typeof item === 'object' && item !== null,
      );
    }

    return [];
  }

  private mapSearchItem(
    item: WalmartSearchItem,
    index: number,
  ): ProductCandidate | null {
    const title = this.readString(
      item.productName,
      item.itemName,
      item.title,
      item.name,
    );
    const productId = this.readString(
      item.itemId,
      item.productId,
      item.usItemId,
      item.id,
    );
    const price = this.readNumber(
      item.price,
      item.currentPrice,
      item.offerPrice,
      item.salePrice,
    );

    if (!title || !productId || price === null) {
      return null;
    }

    return {
      product_id: productId || `walmart-${index}`,
      title,
      brand: this.readString(item.brand, item.brandName),
      price,
      quantity_text: this.readString(
        item.quantityText,
        item.packageSize,
        item.salesUnit,
      ),
      url: this.readString(item.productPageUrl, item.productUrl, item.url),
      image_url: this.readString(
        item.imageUrl,
        item.thumbnailUrl,
        item.primaryImageUrl,
      ),
    } satisfies ProductCandidate;
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
      if (
        typeof value === 'object' &&
        value !== null &&
        'amount' in value &&
        typeof value.amount === 'number'
      ) {
        return value.amount;
      }
    }

    return null;
  }
}
