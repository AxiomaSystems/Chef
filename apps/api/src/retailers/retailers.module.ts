import { Module } from '@nestjs/common';
import { CartExportModule } from '../cart-export/cart-export.module';
import { MatchingModule } from '../matching/matching.module';
import { RetailersController } from './retailers.controller';
import { RetailersService } from './retailers.service';

@Module({
  imports: [MatchingModule, CartExportModule],
  controllers: [RetailersController],
  providers: [RetailersService],
})
export class RetailersModule {}
