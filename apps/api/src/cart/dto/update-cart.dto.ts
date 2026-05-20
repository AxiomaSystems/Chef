import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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
  ingredient_id?: string;

  @ApiPropertyOptional({ example: 'rice' })
  @IsString()
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 'cup' })
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

  @ApiPropertyOptional({ example: 'base' })
  @IsOptional()
  @IsString()
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
  id?: string;

  @ApiPropertyOptional({ example: 'Turkey lettuce wraps' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Southeast Asian' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ type: () => [UpdateCartDishIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCartDishIngredientDto)
  ingredients!: UpdateCartDishIngredientDto[];

  @ApiPropertyOptional({ type: () => [CreateRecipeStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps!: CreateRecipeStepDto[];

  @ApiPropertyOptional({ example: ['quick', 'high protein'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCartDto extends PartialCartSelectionsDto {
  @ApiPropertyOptional({ example: 'Updated weekly dinner plan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsOptional()
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer?: Retailer;

  @ApiPropertyOptional({ type: () => [UpdateCartDishDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCartDishDto)
  dishes?: UpdateCartDishDto[];
}
