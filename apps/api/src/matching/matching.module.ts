import { Module } from '@nestjs/common';
import { MockRetailerProductProvider } from './mock-retailer-product.provider';
import { MatchingService } from './matching.service';
import { WalmartRetailerProductProvider } from './walmart-retailer-product.provider';

@Module({
  providers: [
    MatchingService,
    MockRetailerProductProvider,
    WalmartRetailerProductProvider,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
