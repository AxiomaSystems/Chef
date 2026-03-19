import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Retailer } from '@cart/shared';

class GenerateCartSelectionDto {
  @ApiProperty({ example: 'recipe-1' })
  @IsString()
  recipe_id!: string;

  @ApiProperty({ enum: ['base', 'variant'] })
  @IsIn(['base', 'variant'])
  recipe_type!: 'base' | 'variant';

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings_override?: number;
}

export class GenerateCartDto {
  @ApiProperty({ type: () => [GenerateCartSelectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GenerateCartSelectionDto)
  selections!: GenerateCartSelectionDto[];

  @ApiProperty({ enum: ['walmart'] })
  @IsIn(['walmart'])
  retailer!: Retailer;
}
