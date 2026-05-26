import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

const mealLabels = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'prep',
  'leftover',
  'custom',
] as const;

const sourceTypes = [
  'recipe',
  'manual',
  'leftover',
  'eat_out',
  'prep',
] as const;
const statuses = ['planned', 'cooked', 'eaten', 'skipped'] as const;

export class CreateMealEventDto {
  @ApiProperty({ example: '2026-05-21' })
  @IsString()
  @MaxLength(10)
  date!: string;

  @ApiProperty({ enum: mealLabels })
  @IsIn(mealLabels)
  meal_label!: (typeof mealLabels)[number];

  @ApiPropertyOptional({ example: 'Post-workout' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  custom_label?: string | null;

  @ApiProperty({ enum: sourceTypes })
  @IsIn(sourceTypes)
  source_type!: (typeof sourceTypes)[number];

  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipe_id?: string | null;

  @ApiProperty({ example: 'Lemon Herb Salmon' })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number | null;

  @ApiPropertyOptional({ example: 'Use almond milk' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

export class UpdateMealEventDto {
  @ApiPropertyOptional({ example: '2026-05-21' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  date?: string;

  @ApiPropertyOptional({ enum: mealLabels })
  @IsOptional()
  @IsIn(mealLabels)
  meal_label?: (typeof mealLabels)[number];

  @ApiPropertyOptional({ example: 'Post-workout' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  custom_label?: string | null;

  @ApiPropertyOptional({ enum: sourceTypes })
  @IsOptional()
  @IsIn(sourceTypes)
  source_type?: (typeof sourceTypes)[number];

  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipe_id?: string | null;

  @ApiPropertyOptional({ example: 'Lemon Herb Salmon' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number | null;

  @ApiPropertyOptional({ example: 'Use almond milk' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

export class GenerateMealPlanCartDto {
  @ApiProperty({ example: '2026-05-18' })
  @IsString()
  @MaxLength(10)
  from!: string;

  @ApiProperty({ example: '2026-05-24' })
  @IsString()
  @MaxLength(10)
  to!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  event_ids!: string[];

  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: 'walmart' | 'kroger' | 'instacart';

  @ApiProperty({ enum: ['replace_active', 'append_active'] })
  @IsIn(['replace_active', 'append_active'])
  mode!: 'replace_active' | 'append_active';
}
