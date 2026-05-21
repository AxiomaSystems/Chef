import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Retailer } from '@cart/shared';

class GenerateCartSelectionDto {
  @ApiProperty({ example: 'recipe-1' })
  @IsString()
  @MaxLength(80)
  recipe_id!: string;

  @ApiProperty({ enum: ['base', 'variant'] })
  @IsIn(['base', 'variant'])
  recipe_type!: 'base' | 'variant';

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings_override?: number;
}

export class GenerateCartDto {
  @ApiProperty({ type: () => [GenerateCartSelectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GenerateCartSelectionDto)
  selections!: GenerateCartSelectionDto[];

  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;
}
