import type { Retailer, RetailerIntegrationStatus } from '@cart/shared';
import {
  INSTACART_API_KEY,
  INSTACART_USE_REAL_PROVIDER,
  KROGER_CLIENT_ID,
  KROGER_CLIENT_SECRET,
  KROGER_USE_REAL_PROVIDER,
  WALMART_CLIENT_ID,
  WALMART_CLIENT_SECRET,
  WALMART_USE_REAL_PROVIDER,
} from '../matching/matching.constants';

export type ProviderReadiness = {
  retailer: Retailer;
  status: RetailerIntegrationStatus;
  isAvailable: boolean;
};

export function getProviderReadiness(retailer: Retailer): ProviderReadiness {
  if (retailer === 'instacart') {
    if (!INSTACART_USE_REAL_PROVIDER) {
      return {
        retailer,
        status: 'disabled',
        isAvailable: false,
      };
    }

    return {
      retailer,
      status: hasAllValues([INSTACART_API_KEY])
        ? 'configured'
        : 'missing_credentials',
      isAvailable: hasAllValues([INSTACART_API_KEY]),
    };
  }

  if (retailer === 'kroger') {
    const hasCredentials = hasAllValues([KROGER_CLIENT_ID, KROGER_CLIENT_SECRET]);

    return {
      retailer,
      status: hasCredentials
        ? 'configured'
        : KROGER_USE_REAL_PROVIDER
          ? 'missing_credentials'
          : 'disabled',
      isAvailable: hasCredentials,
    };
  }

  const hasCredentials = hasAllValues([WALMART_CLIENT_ID, WALMART_CLIENT_SECRET]);

  return {
    retailer,
    status: hasCredentials
      ? 'configured'
      : WALMART_USE_REAL_PROVIDER
        ? 'missing_credentials'
        : 'partner_required',
    isAvailable: hasCredentials,
  };
}

function hasAllValues(values: Array<string | undefined>) {
  return values.every((value) => typeof value === 'string' && value.trim() !== '');
}