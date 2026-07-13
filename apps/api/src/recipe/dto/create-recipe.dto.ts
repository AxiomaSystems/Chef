import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const RECIPE_COST_TIERS = ['low', 'medium', 'high'] as const;
export const RECIPE_MEAL_TYPES = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'side',
  'appetizer',
  'drink',
] as const;

export class CreateRecipeStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  step!: number;

  @ApiProperty({ example: 'Saute the onion until translucent.' })
  @IsString()
  @MaxLength(1000)
  what_to_do!: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2880)
  duration_minutes?: number;

  @ApiPropertyOptional({ example: 375 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  temperature?: number;

  @ApiPropertyOptional({ enum: ['F', 'C'], example: 'F' })
  @IsOptional()
  @IsIn(['F', 'C'])
  temperature_unit?: 'F' | 'C';

  @ApiPropertyOptional({ example: 'Simmer sauce' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timer_label?: string;

  @ApiPropertyOptional({ example: ['large skillet'], isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  equipment?: string[];

  @ApiPropertyOptional({
    example: ['d8d2bd4f-10c7-4f78-91c5-2dbb070ab425'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsUUID('4', { each: true })
  ingredient_client_line_ids?: string[];
}

export class CreateDishIngredientDto {
  @ApiPropertyOptional({
    example: 'd8d2bd4f-10c7-4f78-91c5-2dbb070ab425',
  })
  @IsOptional()
  @IsUUID('4')
  client_line_id?: string;

  @ApiProperty({ example: 'rice' })
  @IsString()
  @MaxLength(120)
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  amount?: number;

  @ApiPropertyOptional({ example: 'cup' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional({ example: 'to taste' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  amount_text?: string;

  @ApiPropertyOptional({ example: '2 cups white rice' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  display_ingredient?: string;

  @ApiPropertyOptional({ example: 'rinsed' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  preparation?: string;

  @ApiPropertyOptional({ example: ['lime juice'], isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  substitutions?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @ApiPropertyOptional({ example: 'base' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  group?: string;
}

export class RecipeNutritionDataDto {
  @ApiPropertyOptional({ example: 640 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  calories?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  protein_g?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  carbs_g?: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  fat_g?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  fiber_g?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  sugar_g?: number;

  @ApiPropertyOptional({ example: 780 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  sodium_mg?: number;
}

export class RecipePlanningInputDto {
  @ApiPropertyOptional({
    enum: RECIPE_MEAL_TYPES,
    isArray: true,
    example: ['dinner'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(RECIPE_MEAL_TYPES, { each: true })
  meal_types?: Array<(typeof RECIPE_MEAL_TYPES)[number]>;

  @ApiPropertyOptional({ enum: RECIPE_DIFFICULTIES, example: 'easy' })
  @IsOptional()
  @IsIn(RECIPE_DIFFICULTIES)
  difficulty?: (typeof RECIPE_DIFFICULTIES)[number];

  @ApiPropertyOptional({
    example: 'Mostly pantry prep, one pot, and no tight timing.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  difficulty_reason?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2880)
  prep_time_minutes?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2880)
  cook_time_minutes?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2880)
  total_time_minutes?: number;

  @ApiPropertyOptional({ enum: RECIPE_COST_TIERS, example: 'medium' })
  @IsOptional()
  @IsIn(RECIPE_COST_TIERS)
  estimated_cost_tier?: (typeof RECIPE_COST_TIERS)[number];

  @ApiPropertyOptional({
    example: ['Uses shrimp, but otherwise mostly pantry staples.'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(180, { each: true })
  cost_notes?: string[];
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Arroz con pollo casero' })
  @IsString()
  @MaxLength(140)
  name!: string;

  @ApiProperty({ example: 'cuisine-peruvian' })
  @IsString()
  @MaxLength(80)
  cuisine_id!: string;

  @ApiPropertyOptional({ example: 'Comforting chicken and rice dish.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.example.com/recipes/arroz-con-pollo.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8_000_000)
  cover_image_url?: string;

  @ApiPropertyOptional({ type: () => RecipeNutritionDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeNutritionDataDto)
  nutrition_data?: RecipeNutritionDataDto;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(100)
  servings!: number;

  @ApiPropertyOptional({ type: () => RecipePlanningInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipePlanningInputDto)
  planning?: RecipePlanningInputDto;

  @ApiProperty({ type: () => [CreateDishIngredientDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => CreateDishIngredientDto)
  ingredients!: CreateDishIngredientDto[];

  @ApiProperty({ type: () => [CreateRecipeStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps!: CreateRecipeStepDto[];

  @ApiPropertyOptional({
    example: ['tag-system-dinner', 'tag-user-comfort-food'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tag_ids?: string[];
}
