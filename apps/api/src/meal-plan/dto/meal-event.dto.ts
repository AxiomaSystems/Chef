import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  MealPlanEventStatus,
  MealPlanMealLabel,
  MealPlanSourceType,
} from '@cart/shared';

export const MEAL_EVENT_LABELS = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'prep',
  'leftover',
  'custom',
] as const satisfies readonly MealPlanMealLabel[];

export const MEAL_EVENT_SOURCE_TYPES = [
  'recipe',
  'manual',
  'leftover',
  'eat_out',
  'prep',
] as const satisfies readonly MealPlanSourceType[];

export const MEAL_EVENT_STATUSES = [
  'planned',
  'cooked',
  'eaten',
  'skipped',
] as const satisfies readonly MealPlanEventStatus[];

export class CreateMealEventDto {
  @ApiProperty({ example: '2026-05-18' })
  @IsString()
  @MaxLength(10)
  date!: string;

  @ApiPropertyOptional({ enum: MEAL_EVENT_LABELS })
  @IsOptional()
  @IsIn(MEAL_EVENT_LABELS)
  meal_label?: MealPlanMealLabel;

  @ApiPropertyOptional({ example: 'Post-workout' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  custom_label?: string;

  @ApiPropertyOptional({ enum: MEAL_EVENT_SOURCE_TYPES })
  @IsOptional()
  @IsIn(MEAL_EVENT_SOURCE_TYPES)
  source_type?: MealPlanSourceType;

  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipe_id?: string;

  @ApiPropertyOptional({ example: 'Turkey lettuce wraps' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sort_order?: number;

  @ApiPropertyOptional({ enum: MEAL_EVENT_STATUSES })
  @IsOptional()
  @IsIn(MEAL_EVENT_STATUSES)
  status?: MealPlanEventStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiPropertyOptional({ example: 'Double the sauce.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateMealEventDto {
  @ApiPropertyOptional({ example: '2026-05-18' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  date?: string;

  @ApiPropertyOptional({ enum: MEAL_EVENT_LABELS })
  @IsOptional()
  @IsIn(MEAL_EVENT_LABELS)
  meal_label?: MealPlanMealLabel;

  @ApiPropertyOptional({ example: 'Post-workout' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  custom_label?: string;

  @ApiPropertyOptional({ enum: MEAL_EVENT_SOURCE_TYPES })
  @IsOptional()
  @IsIn(MEAL_EVENT_SOURCE_TYPES)
  source_type?: MealPlanSourceType;

  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipe_id?: string;

  @ApiPropertyOptional({ example: 'Turkey lettuce wraps' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sort_order?: number;

  @ApiPropertyOptional({ enum: MEAL_EVENT_STATUSES })
  @IsOptional()
  @IsIn(MEAL_EVENT_STATUSES)
  status?: MealPlanEventStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiPropertyOptional({ example: 'Double the sauce.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
