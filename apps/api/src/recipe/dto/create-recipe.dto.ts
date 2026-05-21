import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @MaxLength(1000)
  what_to_do!: string;
}

export class CreateDishIngredientDto {
  @ApiProperty({ example: 'rice' })
  @IsString()
  @MaxLength(120)
  canonical_ingredient!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  @Max(10000)
  amount!: number;

  @ApiProperty({ example: 'cup' })
  @IsString()
  @MaxLength(32)
  unit!: string;

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
