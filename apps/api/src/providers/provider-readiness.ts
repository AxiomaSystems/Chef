import type { Retailer, RetailerIntegrationStatus } from '@cart/shared';
import {
  INSTACART_API_KEY,
  INSTACART_ENV,
  INSTACART_USE_REAL_PROVIDER,
  KROGER_CLIENT_ID,
  KROGER_CLIENT_SECRET,
  KROGER_USE_REAL_PROVIDER,
  WALMART_CLIENT_ID,
  WALMART_CLIENT_SECRET,
  WALMART_ENV,
  WALMART_USE_REAL_PROVIDER,
} from '../matching/matching.constants';

export type ProviderReadiness = {
  retailer: Retailer;
  status: RetailerIntegrationStatus;
  isAvailable: boolean;
  mode: 'production' | 'development' | 'sandbox';
};

export function getProviderReadiness(retailer: Retailer): ProviderReadiness {
  if (retailer === 'instacart') {
    if (!INSTACART_USE_REAL_PROVIDER) {
      return {
        retailer,
        status: 'disabled',
        isAvailable: false,
        mode: effectiveInstacartMode(),
      };
    }

    return {
      retailer,
      status: hasAllValues([INSTACART_API_KEY])
        ? 'configured'
        : 'missing_credentials',
      isAvailable: hasAllValues([INSTACART_API_KEY]),
      mode: effectiveInstacartMode(),
    };
  }

  if (retailer === 'kroger') {
    if (!KROGER_USE_REAL_PROVIDER) {
      return {
        retailer,
        status: 'disabled',
        isAvailable: false,
        mode: 'production',
      };
    }

    const hasCredentials = hasAllValues([
      KROGER_CLIENT_ID,
      KROGER_CLIENT_SECRET,
    ]);

    return {
      retailer,
      status: hasCredentials ? 'configured' : 'missing_credentials',
      isAvailable: hasCredentials,
      mode: 'production',
    };
  }

  if (!WALMART_USE_REAL_PROVIDER) {
    return {
      retailer,
      status: 'partner_required',
      isAvailable: false,
      mode: effectiveWalmartMode(),
    };
  }

  const hasCredentials = hasAllValues([
    WALMART_CLIENT_ID,
    WALMART_CLIENT_SECRET,
  ]);

  return {
    retailer,
    status: hasCredentials ? 'configured' : 'missing_credentials',
    isAvailable: hasCredentials,
    mode: effectiveWalmartMode(),
  };
}

function effectiveInstacartMode() {
  return INSTACART_ENV === 'production' ? 'production' : 'development';
}

function effectiveWalmartMode() {
  return WALMART_ENV === 'production' ? 'production' : 'sandbox';
}

function hasAllValues(values: Array<string | undefined>) {
  return values.every(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
}
