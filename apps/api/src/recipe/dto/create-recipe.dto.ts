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
  Min,
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

export class CreateRecipeDto {
  @ApiProperty({ example: 'Arroz con pollo casero' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Peruvian' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: 'Comforting chicken and rice dish.' })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional({ example: ['dinner', 'comfort food'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
