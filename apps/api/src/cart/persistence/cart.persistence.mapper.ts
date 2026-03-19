import type { GenerateCartRequestSelection, GenerateCartResponse } from '@cart/shared';
import type {
  CartDraft as PrismaCartDraft,
  GeneratedCart as PrismaGeneratedCart,
} from '../../../generated/prisma/index.js';
import type {
  GeneratedCartHistorySummary,
  PersistedCartDraft,
  PersistedGeneratedCart,
} from './cart.persistence.types';

export const mapPersistedCartDraft = (
  draft: PrismaCartDraft,
): PersistedCartDraft => ({
  id: draft.id,
  user_id: draft.userId,
  name: draft.name ?? undefined,
  selections: draft.selections as GenerateCartRequestSelection[],
  retailer: draft.retailer,
  created_at: draft.createdAt.toISOString(),
  updated_at: draft.updatedAt.toISOString(),
});

export const mapPersistedGeneratedCart = (
  created: PrismaGeneratedCart,
): PersistedGeneratedCart => ({
  id: created.id,
  user_id: created.userId,
  cart_draft_id: created.cartDraftId ?? undefined,
  dishes: created.dishes as GenerateCartResponse['dishes'],
  overview: created.overview as GenerateCartResponse['overview'],
  matched_items: created.matchedItems as GenerateCartResponse['matched_items'],
  estimated_subtotal: created.estimatedSubtotal,
  retailer: created.retailer as GenerateCartResponse['retailer'],
  created_at: created.createdAt.toISOString(),
  updated_at: created.updatedAt.toISOString(),
});

export const mapGeneratedCartHistorySummary = (
  created: PrismaGeneratedCart,
): GeneratedCartHistorySummary => ({
  id: created.id,
  user_id: created.userId,
  cart_draft_id: created.cartDraftId ?? undefined,
  retailer: created.retailer as GenerateCartResponse['retailer'],
  estimated_subtotal: created.estimatedSubtotal,
  dish_count: (created.dishes as GenerateCartResponse['dishes']).length,
  overview_count: (created.overview as GenerateCartResponse['overview']).length,
  matched_item_count: (
    created.matchedItems as GenerateCartResponse['matched_items']
  ).length,
  created_at: created.createdAt.toISOString(),
  updated_at: created.updatedAt.toISOString(),
});
