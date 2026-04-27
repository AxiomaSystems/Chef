import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiRecipePreviewDto } from './recipe-preview.dto';

export class SwapIngredientDto {
  @ApiProperty({ type: () => AiRecipePreviewDto })
  @ValidateNested()
  @Type(() => AiRecipePreviewDto)
  recipe!: AiRecipePreviewDto;

  @ApiProperty({ example: 'chicken breast' })
  @IsString()
  ingredient_to_replace!: string;

  @ApiProperty({ example: 'black beans' })
  @IsString()
  desired_replacement!: string;

  @ApiPropertyOptional({ example: ['vegetarian'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary_preferences?: string[];

  @ApiPropertyOptional({ example: ['rice', 'olive oil'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inventory?: string[];

  @ApiPropertyOptional({ enum: ['minimize_cost', 'balanced', 'premium'] })
  @IsOptional()
  @IsIn(['minimize_cost', 'balanced', 'premium'])
  budget_mode?: 'minimize_cost' | 'balanced' | 'premium';

  @ApiPropertyOptional({ example: 'Keep the protein high.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

