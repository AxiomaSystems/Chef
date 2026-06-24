import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

export class GenerateMealsDto {
  @ApiProperty({
    example: 'Cheap high-protein burrito bowls for weekday lunches',
  })
  @IsString()
  @MaxLength(2000)
  meal_prompt!: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  servings_per_meal?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  meals_needed?: number;

  @ApiPropertyOptional({ example: ['high protein', 'halal'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  dietary_preferences?: string[];

  @ApiPropertyOptional({ example: ['peanuts'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: ['mushrooms'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  disliked_ingredients?: string[];

  @ApiPropertyOptional({ example: ['rice', 'olive oil', 'garlic'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  inventory?: string[];

  @ApiPropertyOptional({
    enum: ['minimize_cost', 'balanced', 'premium'],
    example: 'minimize_cost',
  })
  @IsOptional()
  @IsIn(['minimize_cost', 'balanced', 'premium'])
  budget_mode?: 'minimize_cost' | 'balanced' | 'premium';

  @ApiPropertyOptional({
    enum: [
      'standard',
      'inventory_first',
      'high_protein',
      'low_calorie',
      'meal_prep',
      'quick',
    ],
    example: 'meal_prep',
  })
  @IsOptional()
  @IsIn([
    'standard',
    'inventory_first',
    'high_protein',
    'low_calorie',
    'meal_prep',
    'quick',
  ])
  meal_style?:
    | 'standard'
    | 'inventory_first'
    | 'high_protein'
    | 'low_calorie'
    | 'meal_prep'
    | 'quick';

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(360)
  max_time_minutes?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_cost_per_serving?: number;

  @ApiPropertyOptional({ example: ['filling', 'reheats well', 'not bland'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  quality_goals?: string[];

  @ApiPropertyOptional({
    enum: ['cost_reduction', 'trend_best_recipe'],
    example: 'cost_reduction',
  })
  @IsOptional()
  @IsIn(['cost_reduction', 'trend_best_recipe'])
  ai_planning_optimization?: 'cost_reduction' | 'trend_best_recipe';

  @ApiPropertyOptional({
    example: 'Use ingredients available in a normal US grocery store.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
