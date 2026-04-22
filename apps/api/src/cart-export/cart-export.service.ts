import { Injectable } from '@nestjs/common';
import { InstacartCartExportProvider } from './instacart-cart-export.provider';
import type {
  CartHandoffResult,
  CreateCartHandoffInput,
} from './cart-export.types';

@Injectable()
export class CartExportService {
  constructor(
    private readonly instacartProvider: InstacartCartExportProvider,
  ) {}

  isProviderEnabled(retailer: CreateCartHandoffInput['retailer']) {
    if (retailer === 'instacart') {
      return this.instacartProvider.isEnabled();
    }

    return true;
  }

  async createHandoff(
    input: CreateCartHandoffInput,
  ): Promise<CartHandoffResult> {
    if (input.retailer !== 'instacart') {
      return {};
    }

    return this.instacartProvider.createShoppingList({
      cartId: input.cartId,
      title: input.cartName ?? 'Chef shopping list',
      overview: input.overview,
      dishes: input.dishes,
    });
  }
}
