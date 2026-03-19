import type {
  GenerateCartRequestSelection,
  GenerateCartResponse,
} from '@cart/shared';

export type PersistedCartDraft = {
  id: string;
  user_id: string;
  name?: string;
  selections: GenerateCartRequestSelection[];
  retailer: string;
  created_at: string;
  updated_at: string;
};

export type GeneratedCartHistorySummary = {
  id: string;
  user_id: string;
  cart_draft_id?: string;
  retailer: GenerateCartResponse['retailer'];
  estimated_subtotal: number;
  dish_count: number;
  overview_count: number;
  matched_item_count: number;
  created_at: string;
  updated_at: string;
};

export type PersistedGeneratedCart = GenerateCartResponse & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateCartDraftPersistenceInput = {
  userId: string;
  name?: string;
  selections: GenerateCartRequestSelection[];
  retailer: string;
};

export type CreateGeneratedCartPersistenceInput = {
  userId: string;
  cartDraftId?: string;
  cart: GenerateCartResponse;
};
