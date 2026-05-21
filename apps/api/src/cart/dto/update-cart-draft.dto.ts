import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { Retailer } from '@cart/shared';
import { CartSelectionDto } from './cart-selection.dto';

export class UpdateCartDraftDto {
  @ApiPropertyOptional({ example: 'Updated weekly dinner plan' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @ApiPropertyOptional({ type: () => [CartSelectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartSelectionDto)
  selections?: CartSelectionDto[];

  @ApiPropertyOptional({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsOptional()
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer?: Retailer;
}
