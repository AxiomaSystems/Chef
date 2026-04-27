import { Injectable } from '@nestjs/common';
import type { RetailerCapability } from '@cart/shared';
import { CartExportService } from '../cart-export/cart-export.service';
import { WALMART_USE_REAL_PROVIDER } from '../matching/matching.constants';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class RetailersService {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly cartExportService: CartExportService,
  ) {}

  listCapabilities(): RetailerCapability[] {
    const krogerEnabled = this.matchingService.isProviderEnabled('kroger');
    const instacartEnabled =
      this.cartExportService.isProviderEnabled('instacart');

    return [
      {
        retailer: 'instacart',
        label: 'Instacart',
        supports_product_search: false,
        supports_location_lookup: false,
        supports_cart_handoff: true,
        supports_native_checkout: false,
        requires_location: false,
        requires_api_key: true,
        status: instacartEnabled ? 'configured' : 'disabled',
        demo_priority: 1,
        notes:
          'Preferred demo handoff path. Generates a hosted Instacart shopping-list URL when configured.',
      },
      {
        retailer: 'kroger',
        label: 'Kroger',
        supports_product_search: true,
        supports_location_lookup: true,
        supports_cart_handoff: false,
        supports_native_checkout: false,
        requires_location: true,
        requires_api_key: true,
        status: krogerEnabled ? 'configured' : 'disabled',
        demo_priority: 2,
        notes:
          'Best current proof of real line-by-line product matching and subtotal estimation.',
      },
      {
        retailer: 'walmart',
        label: 'Walmart',
        supports_product_search: Boolean(WALMART_USE_REAL_PROVIDER),
        supports_location_lookup: false,
        supports_cart_handoff: false,
        supports_native_checkout: false,
        requires_location: false,
        requires_api_key: true,
        status: WALMART_USE_REAL_PROVIDER ? 'configured' : 'partner_required',
        demo_priority: 99,
        notes:
          'Provider boundary exists, but real Walmart access is approval-heavy and should not block the demo.',
      },
    ];
  }
}
