import { Module } from '@nestjs/common';
import { CartExportService } from './cart-export.service';
import { InstacartCartExportProvider } from './instacart-cart-export.provider';

@Module({
  providers: [CartExportService, InstacartCartExportProvider],
  exports: [CartExportService],
})
export class CartExportModule {}
