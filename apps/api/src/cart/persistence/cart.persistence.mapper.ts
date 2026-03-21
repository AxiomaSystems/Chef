import type {
  Cart,
  CartSelection,
  ShoppingCart,
} from '@cart/shared';
import type {
  CartDraft as PrismaCartDraft,
  Cart as PrismaCart,
  ShoppingCart as PrismaShoppingCart,
} from '../../../generated/prisma/index.js';
import type {
  PersistedCart,
  PersistedCartDraft,
  PersistedShoppingCart,
  PersistedShoppingCartHistorySummary,
} from './cart.persistence.types';

export const mapPersistedCartDraft = (
  draft: PrismaCartDraft,
): PersistedCartDraft => ({
  id: draft.id,
  user_id: draft.userId,
  name: draft.name ?? undefined,
  selections: draft.selections as CartSelection[],
  retailer: draft.retailer,
  created_at: draft.createdAt.toISOString(),
  updated_at: draft.updatedAt.toISOString(),
});

export const mapPersistedCart = (cart: PrismaCart): PersistedCart => ({
  id: cart.id,
  user_id: cart.userId,
  name: cart.name ?? undefined,
  retailer: cart.retailer as Cart['retailer'],
  selections: cart.selections as CartSelection[],
  dishes: cart.dishes as Cart['dishes'],
  overview: [],
  created_at: cart.createdAt.toISOString(),
  updated_at: cart.updatedAt.toISOString(),
});

export const mapPersistedShoppingCart = (
  shoppingCart: PrismaShoppingCart,
): PersistedShoppingCart => ({
  id: shoppingCart.id,
  user_id: shoppingCart.userId,
  cart_id: shoppingCart.cartId,
  overview: shoppingCart.overview as ShoppingCart['overview'],
  matched_items: shoppingCart.matchedItems as ShoppingCart['matched_items'],
  estimated_subtotal: shoppingCart.estimatedSubtotal,
  estimated_total: shoppingCart.estimatedTotal ?? undefined,
  retailer: shoppingCart.retailer as ShoppingCart['retailer'],
  created_at: shoppingCart.createdAt.toISOString(),
  updated_at: shoppingCart.updatedAt.toISOString(),
});

export const mapShoppingCartHistorySummary = (
  shoppingCart: PrismaShoppingCart,
): PersistedShoppingCartHistorySummary => ({
  id: shoppingCart.id,
  user_id: shoppingCart.userId,
  cart_id: shoppingCart.cartId,
  retailer: shoppingCart.retailer as ShoppingCart['retailer'],
  estimated_subtotal: shoppingCart.estimatedSubtotal,
  overview_count: (shoppingCart.overview as ShoppingCart['overview']).length,
  matched_item_count: (
    shoppingCart.matchedItems as ShoppingCart['matched_items']
  ).length,
  created_at: shoppingCart.createdAt.toISOString(),
  updated_at: shoppingCart.updatedAt.toISOString(),
});
