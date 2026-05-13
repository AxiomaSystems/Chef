import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddVisionObservationToInventoryDto {
  @ApiPropertyOptional({ example: 'olive oil bottle' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ example: 'ingredient-olive-oil' })
  @IsOptional()
  @IsString()
  ingredient_id?: string;

  @ApiPropertyOptional({ example: 'olive-oil' })
  @IsOptional()
  @IsString()
  canonical_slug?: string;

  @ApiPropertyOptional({ example: 'olive oil' })
  @IsOptional()
  @IsString()
  canonical_name?: string;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number;

  @ApiPropertyOptional({ example: 'bottle' })
  @IsOptional()
  @IsString()
  unit?: string;
}
