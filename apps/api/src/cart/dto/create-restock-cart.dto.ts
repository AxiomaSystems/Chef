import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString, ArrayMinSize } from 'class-validator';
import type { Retailer } from '@cart/shared';

export class CreateRestockCartDto {
  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;

  @ApiProperty({ type: [String], description: 'Ingredient names to restock' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  items!: string[];
}
