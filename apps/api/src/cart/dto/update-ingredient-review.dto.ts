import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { IngredientReviewAction } from '@cart/shared';

export class UpdateIngredientReviewItemDto {
  @ApiPropertyOptional({ example: 'ingredient-rice' })
  @IsOptional()
  @IsString()
  ingredient_id?: string;

  @ApiProperty({ example: 'rice' })
  @IsString()
  canonical_ingredient!: string;

  @ApiProperty({ example: 'cup' })
  @IsString()
  unit!: string;

  @ApiProperty({ enum: ['buy', 'already_have', 'skip', 'adjust'] })
  @IsIn(['buy', 'already_have', 'skip', 'adjust'])
  action!: IngredientReviewAction;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adjusted_amount?: number;

  @ApiPropertyOptional({ example: 'cup' })
  @IsOptional()
  @IsString()
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
  @ValidateNested({ each: true })
  @Type(() => UpdateIngredientReviewItemDto)
  items!: UpdateIngredientReviewItemDto[];
}
