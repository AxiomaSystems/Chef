import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { IngredientReviewAction } from '@cart/shared';

export class UpdateIngredientReviewItemDto {
  @ApiPropertyOptional({ example: 'ingredient-rice' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ingredient_id?: string;

  @ApiProperty({ example: 'rice' })
  @IsString()
  @MaxLength(120)
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 'cup' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string | null;

  @ApiProperty({ enum: ['buy', 'already_have', 'skip', 'adjust'] })
  @IsIn(['buy', 'already_have', 'skip', 'adjust'])
  action!: IngredientReviewAction;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  adjusted_amount?: number;

  @ApiPropertyOptional({ example: 'cup' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  adjusted_unit?: string;
}

export class UpdateIngredientReviewDto {
  @ApiProperty({
    example: [
      {
        canonical_ingredient: 'rice',
        unit: 'cup',
        action: 'adjust',
        adjusted_amount: 1.5,
        adjusted_unit: 'cup',
      },
      {
        canonical_ingredient: 'cilantro',
        unit: 'g',
        action: 'already_have',
      },
    ],
  })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UpdateIngredientReviewItemDto)
  items!: UpdateIngredientReviewItemDto[];
}
