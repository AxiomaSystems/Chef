import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiDishIngredientDto {
  @ApiProperty({ example: 'chicken breast' })
  @IsString()
  canonical_ingredient!: string;

  @ApiProperty({ example: 1.25 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'lb' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: 'boneless skinless chicken breast' })
  @IsOptional()
  @IsString()
  display_ingredient?: string | null;

  @ApiPropertyOptional({ example: 'diced' })
  @IsOptional()
  @IsString()
  preparation?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @ApiPropertyOptional({ example: 'main' })
  @IsOptional()
  @IsString()
  group?: string | null;
}

export class AiRecipeStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  step!: number;

  @ApiProperty({ example: 'Cook the rice according to package directions.' })
  @IsString()
  what_to_do!: string;
}

export class AiRecipePreviewDto {
  @ApiProperty({ example: 'Chicken burrito bowls' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Tex-Mex' })
  @IsString()
  cuisine!: string;

  @ApiProperty({ example: 'A budget-friendly meal prep bowl.' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  servings!: number;

  @ApiProperty({ type: () => [AiDishIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiDishIngredientDto)
  ingredients!: AiDishIngredientDto[];

  @ApiProperty({ type: () => [AiRecipeStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiRecipeStepDto)
  steps!: AiRecipeStepDto[];

  @ApiPropertyOptional({ example: ['high protein', 'meal prep'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: { calories: 520, protein_g: 38 } })
  @IsOptional()
  @IsObject()
  nutrition_estimate?: Record<string, number> | null;

  @ApiPropertyOptional({
    enum: [
      'breakfast',
      'brunch',
      'lunch',
      'dinner',
      'snack',
      'dessert',
      'side',
      'appetizer',
      'drink',
    ],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(
    [
      'breakfast',
      'brunch',
      'lunch',
      'dinner',
      'snack',
      'dessert',
      'side',
      'appetizer',
      'drink',
    ],
    { each: true },
  )
  meal_types?: Array<
    | 'breakfast'
    | 'brunch'
    | 'lunch'
    | 'dinner'
    | 'snack'
    | 'dessert'
    | 'side'
    | 'appetizer'
    | 'drink'
  >;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({
    example: 'Short active prep and one straightforward cooking method.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  difficulty_reason?: string | null;

  @ApiPropertyOptional({ example: 10, nullable: true })
  @IsOptional()
  prep_time_minutes?: number | null;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  cook_time_minutes?: number | null;

  @ApiPropertyOptional({ example: 30, nullable: true })
  @IsOptional()
  total_time_minutes?: number | null;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  estimated_cost_tier?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ example: ['Uses canned beans to lower cost.'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cost_notes?: string[];

  @ApiPropertyOptional({
    example: ['Frozen vegetables trade texture for savings.'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quality_tradeoffs?: string[];

  @ApiPropertyOptional({ example: ['Prices vary by retailer.'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assumptions?: string[];
}
