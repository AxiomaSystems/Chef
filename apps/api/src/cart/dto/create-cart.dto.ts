import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Retailer } from '@cart/shared';
import { CartSelectionsDto } from './cart-selection.dto';

export class CreateCartDto extends CartSelectionsDto {
  @ApiPropertyOptional({ example: 'Weekly dinner plan' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;
}
