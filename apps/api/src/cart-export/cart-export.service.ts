import { Injectable } from '@nestjs/common';
import { InstacartCartExportProvider } from './instacart-cart-export.provider';
import type {
  CartHandoffResult,
  CreateCartHandoffInput,
} from './cart-export.types';
import { getProviderReadiness } from '../providers/provider-readiness';

@Injectable()
export class CartExportService {
  constructor(
    private readonly instacartProvider: InstacartCartExportProvider,
  ) {}

  getProviderReadiness(retailer: CreateCartHandoffInput['retailer']) {
    if (retailer === 'instacart') {
      return getProviderReadiness('instacart');
    }

    return {
      retailer,
      status: 'configured' as const,
      isAvailable: true,
    };
  }

  isProviderEnabled(retailer: CreateCartHandoffInput['retailer']) {
    return this.getProviderReadiness(retailer).isAvailable;
  }

  async createHandoff(
    input: CreateCartHandoffInput,
  ): Promise<CartHandoffResult> {
    if (input.retailer !== 'instacart') {
      return {};
    }

    return this.instacartProvider.createShoppingList({
      cartId: input.cartId,
      title: input.cartName ?? 'Preppie shopping list',
      overview: input.overview,
      dishes: input.dishes,
    });
  }
}
