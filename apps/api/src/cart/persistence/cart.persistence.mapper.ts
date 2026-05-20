import type {
  Cart,
  CartSelection,
  IngredientReview,
  ShoppingCart,
} from '@cart/shared';
import type {
  CartDraft as PrismaCartDraft,
  Cart as PrismaCart,
  IngredientReview as PrismaIngredientReview,
  ShoppingCart as PrismaShoppingCart,
} from '../../../generated/prisma/index.js';
import type {
  PersistedCart,
  PersistedCartDraft,
  PersistedIngredientReview,
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
  status: cart.status,
  selections: cart.selections as CartSelection[],
  dishes: cart.dishes as Cart['dishes'],
  overview: [],
  created_at: cart.createdAt.toISOString(),
  updated_at: cart.updatedAt.toISOString(),
});

export const mapPersistedIngredientReview = (
  review: PrismaIngredientReview,
): PersistedIngredientReview => ({
  cart_id: review.cartId,
  items: review.items as IngredientReview['items'],
  created_at: review.createdAt.toISOString(),
  updated_at: review.updatedAt.toISOString(),
});

export const mapPersistedShoppingCart = (
  shoppingCart: PrismaShoppingCart,
): PersistedShoppingCart => ({
  id: shoppingCart.id,
  user_id: shoppingCart.userId,
  cart_id: shoppingCart.cartId,
  name: shoppingCart.name ?? undefined,
  overview: shoppingCart.overview as ShoppingCart['overview'],
  matched_items: shoppingCart.matchedItems as ShoppingCart['matched_items'],
  estimated_subtotal: shoppingCart.estimatedSubtotal,
  estimated_total: shoppingCart.estimatedTotal ?? undefined,
  retailer: shoppingCart.retailer as ShoppingCart['retailer'],
  status: shoppingCart.status,
  external_url: shoppingCart.externalUrl ?? undefined,
  external_reference_id: shoppingCart.externalReferenceId ?? undefined,
  checked_out_at: shoppingCart.checkedOutAt?.toISOString() ?? undefined,
  inventory_applied_at:
    shoppingCart.inventoryAppliedAt?.toISOString() ?? undefined,
  created_at: shoppingCart.createdAt.toISOString(),
  updated_at: shoppingCart.updatedAt.toISOString(),
});

export const mapShoppingCartHistorySummary = (
  shoppingCart: PrismaShoppingCart,
): PersistedShoppingCartHistorySummary => ({
  id: shoppingCart.id,
  user_id: shoppingCart.userId,
  cart_id: shoppingCart.cartId,
  name: shoppingCart.name ?? undefined,
  retailer: shoppingCart.retailer as ShoppingCart['retailer'],
  status: shoppingCart.status,
  estimated_subtotal: shoppingCart.estimatedSubtotal,
  external_url: shoppingCart.externalUrl ?? undefined,
  external_reference_id: shoppingCart.externalReferenceId ?? undefined,
  checked_out_at: shoppingCart.checkedOutAt?.toISOString() ?? undefined,
  inventory_applied_at:
    shoppingCart.inventoryAppliedAt?.toISOString() ?? undefined,
  overview_count: (shoppingCart.overview as ShoppingCart['overview']).length,
  matched_item_count: (
    shoppingCart.matchedItems as ShoppingCart['matched_items']
  ).length,
  created_at: shoppingCart.createdAt.toISOString(),
  updated_at: shoppingCart.updatedAt.toISOString(),
});
