import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsString,
  ArrayMaxSize,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import type { Retailer } from '@cart/shared';

export class CreateRestockCartDto {
  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;

  @ApiProperty({ type: [String], description: 'Ingredient names to restock' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  items!: string[];
}
