import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateRecipeStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  step!: number;

  @ApiProperty({ example: 'Saute the onion until translucent.' })
  @IsString()
  what_to_do!: string;
}

export class CreateDishIngredientDto {
  @ApiProperty({ example: 'rice' })
  @IsString()
  canonical_ingredient!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'cup' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: '2 cups white rice' })
  @IsOptional()
  @IsString()
  display_ingredient?: string;

  @ApiPropertyOptional({ example: 'rinsed' })
  @IsOptional()
  @IsString()
  preparation?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @ApiPropertyOptional({ example: 'base' })
  @IsOptional()
  @IsString()
  group?: string;
}

export class RecipeNutritionDataDto {
  @ApiPropertyOptional({ example: 640 })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  protein_g?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  carbs_g?: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  fat_g?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  fiber_g?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsNumber()
  sugar_g?: number;

  @ApiPropertyOptional({ example: 780 })
  @IsOptional()
  @IsNumber()
  sodium_mg?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Arroz con pollo casero' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'cuisine-peruvian' })
  @IsString()
  cuisine_id!: string;

  @ApiPropertyOptional({ example: 'Comforting chicken and rice dish.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.example.com/recipes/arroz-con-pollo.jpg',
  })
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsUrl()
  cover_image_url?: string;

  @ApiPropertyOptional({ type: () => RecipeNutritionDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeNutritionDataDto)
  nutrition_data?: RecipeNutritionDataDto;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  servings!: number;

  @ApiProperty({ type: () => [CreateDishIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDishIngredientDto)
  ingredients!: CreateDishIngredientDto[];

  @ApiProperty({ type: () => [CreateRecipeStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps!: CreateRecipeStepDto[];

  @ApiPropertyOptional({ example: ['tag-system-dinner', 'tag-user-comfort-food'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tag_ids?: string[];
}
