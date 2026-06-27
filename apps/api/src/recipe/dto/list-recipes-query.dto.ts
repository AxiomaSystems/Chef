import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RECIPE_COST_TIERS,
  RECIPE_DIFFICULTIES,
  RECIPE_MEAL_TYPES,
} from './create-recipe.dto';

export class ListRecipesQueryDto {
  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous recipe list page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  cursor?: string;

  @ApiPropertyOptional({ example: 'okra tomato stew' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ example: 'cuisine-west-african' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cuisine_id?: string;

  @ApiPropertyOptional({ example: 'tag-high-protein' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag_id?: string;

  @ApiPropertyOptional({ enum: RECIPE_MEAL_TYPES, example: 'dinner' })
  @IsOptional()
  @IsIn(RECIPE_MEAL_TYPES)
  meal_type?: (typeof RECIPE_MEAL_TYPES)[number];

  @ApiPropertyOptional({ enum: RECIPE_DIFFICULTIES, example: 'easy' })
  @IsOptional()
  @IsIn(RECIPE_DIFFICULTIES)
  difficulty?: (typeof RECIPE_DIFFICULTIES)[number];

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2880)
  max_total_time_minutes?: number;

  @ApiPropertyOptional({ enum: RECIPE_COST_TIERS, example: 'medium' })
  @IsOptional()
  @IsIn(RECIPE_COST_TIERS)
  estimated_cost_tier?: (typeof RECIPE_COST_TIERS)[number];

  @ApiPropertyOptional({ enum: ['public', 'mine', 'saved'] })
  @IsOptional()
  @IsIn(['public', 'mine', 'saved'])
  owner?: 'public' | 'mine' | 'saved';
}
