import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { Retailer } from '@cart/shared';

export class RestockCartItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsString()
  unit!: string;
}

export class CreateRestockCartDto {
  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;

  @ApiProperty({
    type: [RestockCartItemDto],
    description: 'Ingredient names and requested amounts to restock',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsOptional({ each: true })
  items!: Array<string | RestockCartItemDto>;
}
