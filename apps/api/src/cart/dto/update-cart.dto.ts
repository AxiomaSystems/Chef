import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Retailer } from '@cart/shared';
import { PartialCartSelectionsDto } from './cart-selection.dto';
import { CreateRecipeStepDto } from '../../recipe/dto/create-recipe.dto';

class UpdateCartDishIngredientDto {
  @ApiPropertyOptional({ example: 'ingredient-rice' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ingredient_id?: string;

  @ApiPropertyOptional({ example: 'rice' })
  @IsString()
  @MaxLength(120)
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(0)
  @Max(10000)
  amount!: number;

  @ApiPropertyOptional({ example: 'cup' })
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

  @ApiPropertyOptional({ example: 'base' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  group?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}

class UpdateCartDishDto {
  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  id?: string;

  @ApiPropertyOptional({ example: 'Turkey lettuce wraps' })
  @IsString()
  @MaxLength(140)
  name!: string;

  @ApiPropertyOptional({ example: 'Southeast Asian' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cuisine?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number;

  @ApiPropertyOptional({ type: () => [UpdateCartDishIngredientDto] })
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => UpdateCartDishIngredientDto)
  ingredients!: UpdateCartDishIngredientDto[];

  @ApiPropertyOptional({ type: () => [CreateRecipeStepDto] })
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps!: CreateRecipeStepDto[];

  @ApiPropertyOptional({ example: ['quick', 'high protein'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];
}

export class UpdateCartDto extends PartialCartSelectionsDto {
  @ApiPropertyOptional({ example: 'Updated weekly dinner plan' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @ApiPropertyOptional({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsOptional()
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer?: Retailer;

  @ApiPropertyOptional({ type: () => [UpdateCartDishDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => UpdateCartDishDto)
  dishes?: UpdateCartDishDto[];
}
