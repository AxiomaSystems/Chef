import { Type } from 'class-transformer';
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
  @IsInt()
  @Min(1)
  step!: number;

  @IsString()
  what_to_do!: string;
}

export class CreateDishIngredientDto {
  @IsString()
  canonical_ingredient!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  display_ingredient?: string;

  @IsOptional()
  @IsString()
  preparation?: string;

  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @IsOptional()
  @IsString()
  group?: string;
}

export class CreateRecipeDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  servings!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDishIngredientDto)
  ingredients!: CreateDishIngredientDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps!: CreateRecipeStepDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
