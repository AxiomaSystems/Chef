import type { AggregatedIngredient, Dish, Retailer } from '@cart/shared';

export type CreateCartHandoffInput = {
  cartId: string;
  cartName?: string;
  retailer: Retailer;
  overview: AggregatedIngredient[];
  dishes: Dish[];
};

export type CartHandoffResult = {
  externalUrl?: string;
  externalReferenceId?: string;
};
