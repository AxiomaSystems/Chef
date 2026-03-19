import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CreateDishIngredientDto,
  CreateRecipeStepDto,
} from './create-recipe.dto';

export class UpdateRecipeDto {
  @ApiPropertyOptional({ example: 'Arroz con pollo actualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'cuisine-peruvian' })
  @IsOptional()
  @IsString()
  cuisine_id?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ type: () => [CreateDishIngredientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDishIngredientDto)
  ingredients?: CreateDishIngredientDto[];

  @ApiPropertyOptional({ type: () => [CreateRecipeStepDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps?: CreateRecipeStepDto[];

  @ApiPropertyOptional({ example: ['tag-system-updated'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tag_ids?: string[];
}
