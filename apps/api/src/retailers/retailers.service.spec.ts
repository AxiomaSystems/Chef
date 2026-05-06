import { RetailersService } from './retailers.service';
import { MatchingService } from '../matching/matching.service';
import { CartExportService } from '../cart-export/cart-export.service';

describe('RetailersService', () => {
  let service: RetailersService;
  let matchingService: jest.Mocked<MatchingService>;
  let cartExportService: jest.Mocked<CartExportService>;

  beforeEach(() => {
    matchingService = {
      getProviderReadiness: jest.fn(),
    } as unknown as jest.Mocked<MatchingService>;

    cartExportService = {
      getProviderReadiness: jest.fn(),
    } as unknown as jest.Mocked<CartExportService>;

    service = new RetailersService(matchingService, cartExportService);
  });

  it('returns explicit capability states for configured and missing-credential providers', () => {
    matchingService.getProviderReadiness.mockImplementation((retailer) => {
      if (retailer === 'kroger') {
        return {
          retailer: 'kroger',
          status: 'missing_credentials',
          isAvailable: false,
        };
      }

      return {
        retailer,
        status: 'configured',
        isAvailable: true,
      };
    });

    cartExportService.getProviderReadiness.mockReturnValue({
      retailer: 'instacart',
      status: 'configured',
      isAvailable: true,
    });

    const capabilities = service.listCapabilities();

    expect(capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          retailer: 'instacart',
          status: 'configured',
          supports_cart_handoff: true,
        }),
        expect.objectContaining({
          retailer: 'kroger',
          status: 'missing_credentials',
          requires_location: true,
        }),
      ]),
    );
  });
});