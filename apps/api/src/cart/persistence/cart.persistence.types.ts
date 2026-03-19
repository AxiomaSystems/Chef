import type {
  Cart,
  CartSelection,
  ShoppingCart,
  ShoppingCartHistorySummary,
} from '@cart/shared';

export type PersistedCartDraft = {
  id: string;
  user_id: string;
  name?: string;
  selections: CartSelection[];
  retailer: string;
  created_at: string;
  updated_at: string;
};

export type PersistedCart = Cart & {
  id: string;
  user_id: string;
};

export type CreateCartDraftPersistenceInput = {
  userId: string;
  name?: string;
  selections: CartSelection[];
  retailer: string;
};

export type UpdateCartDraftPersistenceInput = {
  name?: string;
  selections?: CartSelection[];
  retailer?: string;
};

export type CreateCartPersistenceInput = {
  userId: string;
  name?: string;
  selections: CartSelection[];
  dishes: Cart['dishes'];
};

export type UpdateCartPersistenceInput = {
  name?: string;
  selections?: CartSelection[];
  dishes?: Cart['dishes'];
};

export type PersistedShoppingCart = ShoppingCart & {
  id: string;
  user_id: string;
  cart_id: string;
};

export type PersistedShoppingCartHistorySummary = ShoppingCartHistorySummary;

export type CreateShoppingCartPersistenceInput = {
  userId: string;
  cartId: string;
  cartDraftId?: string;
  shoppingCart: Omit<ShoppingCart, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
};
