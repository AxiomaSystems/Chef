import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiRecipePreviewDto } from './recipe-preview.dto';

export class SwapIngredientDto {
  @ApiProperty({ type: () => AiRecipePreviewDto })
  @ValidateNested()
  @Type(() => AiRecipePreviewDto)
  recipe!: AiRecipePreviewDto;

  @ApiProperty({ example: 'chicken breast' })
  @IsString()
  @MaxLength(200)
  ingredient_to_replace!: string;

  @ApiProperty({ example: 'black beans' })
  @IsString()
  @MaxLength(200)
  desired_replacement!: string;

  @ApiPropertyOptional({ example: ['vegetarian'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  dietary_preferences?: string[];

  @ApiPropertyOptional({ example: ['rice', 'olive oil'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  inventory?: string[];

  @ApiPropertyOptional({ enum: ['minimize_cost', 'balanced', 'premium'] })
  @IsOptional()
  @IsIn(['minimize_cost', 'balanced', 'premium'])
  budget_mode?: 'minimize_cost' | 'balanced' | 'premium';

  @ApiPropertyOptional({ example: 'Keep the protein high.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
