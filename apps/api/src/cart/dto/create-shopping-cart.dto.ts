import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { Retailer } from '@cart/shared';

export class CreateShoppingCartDto {
  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;
}
