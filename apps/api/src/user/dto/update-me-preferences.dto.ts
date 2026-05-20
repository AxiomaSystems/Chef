import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AVAILABLE_APPLIANCE_VALUES,
  BIGGEST_COOKING_FRUSTRATION_VALUES,
  CALORIE_TRACKING_MODE_VALUES,
  COOKING_SKILL_LEVEL_VALUES,
  DISLIKED_INGREDIENT_VALUES,
  DISLIKED_TEXTURE_VALUES,
  FAVORITE_FLAVOR_VALUES,
  FAVORITE_PROTEIN_VALUES,
  GOAL_PRIORITY_VALUES,
  HOUSEHOLD_SIZE_VALUES,
  KIDS_PROFILE_VALUES,
  PREFERRED_COOKING_TIME_VALUES,
  PREFERRED_STORE_VALUES,
  RECIPE_DISCOVERY_SOURCE_VALUES,
  SHOPPING_MODE_VALUES,
  SPICE_LEVEL_VALUES,
  TYPICAL_MEAL_TIME_VALUES,
  WEEKLY_BUDGET_VALUES,
} from '@cart/shared';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class UpdateShoppingLocationDto {
  @ApiPropertyOptional({ example: '60611' })
  @IsOptional()
  @IsString()
  zip_code?: string;

  @ApiPropertyOptional({ example: 'Chicago, IL' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 41.8925 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -87.6262 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '01600479' })
  @IsOptional()
  @IsString()
  kroger_location_id?: string;
}

class UpdateWeeklyNutritionTargetsDto {
  @ApiPropertyOptional({ example: 14000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein_g?: number;

  @ApiPropertyOptional({ example: 1750 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs_g?: number;

  @ApiPropertyOptional({ example: 490 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat_g?: number;
}

export class UpdateMePreferencesDto {
  @ApiProperty({ example: ['cuisine-peruvian', 'cuisine-mediterranean'] })
  @IsArray()
  @IsString({ each: true })
  preferred_cuisine_ids!: string[];

  @ApiProperty({ example: ['tag-system-weeknight', 'tag-system-comfort-food'] })
  @IsArray()
  @IsString({ each: true })
  preferred_tag_ids!: string[];

  @ApiPropertyOptional({ type: () => UpdateShoppingLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateShoppingLocationDto)
  shopping_location?: UpdateShoppingLocationDto;

  @ApiPropertyOptional({ enum: HOUSEHOLD_SIZE_VALUES })
  @IsOptional()
  @IsIn(HOUSEHOLD_SIZE_VALUES)
  household_size?: string;

  @ApiPropertyOptional({ enum: KIDS_PROFILE_VALUES })
  @IsOptional()
  @IsIn(KIDS_PROFILE_VALUES)
  kids_profile?: string;

  @ApiPropertyOptional({ enum: FAVORITE_PROTEIN_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(FAVORITE_PROTEIN_VALUES, { each: true })
  favorite_proteins?: string[];

  @ApiPropertyOptional({ enum: FAVORITE_FLAVOR_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(FAVORITE_FLAVOR_VALUES, { each: true })
  favorite_flavors?: string[];

  @ApiPropertyOptional({ enum: SPICE_LEVEL_VALUES })
  @IsOptional()
  @IsIn(SPICE_LEVEL_VALUES)
  spice_level?: string;

  @ApiPropertyOptional({ enum: DISLIKED_INGREDIENT_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(DISLIKED_INGREDIENT_VALUES, { each: true })
  disliked_ingredients?: string[];

  @ApiPropertyOptional({ enum: DISLIKED_TEXTURE_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(DISLIKED_TEXTURE_VALUES, { each: true })
  disliked_textures?: string[];

  @ApiPropertyOptional({ enum: COOKING_SKILL_LEVEL_VALUES })
  @IsOptional()
  @IsIn(COOKING_SKILL_LEVEL_VALUES)
  cooking_skill_level?: string;

  @ApiPropertyOptional({ enum: AVAILABLE_APPLIANCE_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(AVAILABLE_APPLIANCE_VALUES, { each: true })
  available_appliances?: string[];

  @ApiPropertyOptional({ enum: PREFERRED_COOKING_TIME_VALUES })
  @IsOptional()
  @IsIn(PREFERRED_COOKING_TIME_VALUES)
  preferred_cooking_time?: string;

  @ApiPropertyOptional({ enum: TYPICAL_MEAL_TIME_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(TYPICAL_MEAL_TIME_VALUES, { each: true })
  typical_meal_times?: string[];

  @ApiPropertyOptional({ enum: GOAL_PRIORITY_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(GOAL_PRIORITY_VALUES, { each: true })
  goal_priorities?: string[];

  @ApiPropertyOptional({ enum: CALORIE_TRACKING_MODE_VALUES })
  @IsOptional()
  @IsIn(CALORIE_TRACKING_MODE_VALUES)
  calorie_tracking_mode?: string;

  @ApiPropertyOptional({ type: () => UpdateWeeklyNutritionTargetsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateWeeklyNutritionTargetsDto)
  weekly_nutrition_targets?: UpdateWeeklyNutritionTargetsDto;

  @ApiPropertyOptional({ enum: WEEKLY_BUDGET_VALUES })
  @IsOptional()
  @IsIn(WEEKLY_BUDGET_VALUES)
  weekly_budget?: string;

  @ApiPropertyOptional({ enum: PREFERRED_STORE_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(PREFERRED_STORE_VALUES, { each: true })
  preferred_stores?: string[];

  @ApiPropertyOptional({ enum: SHOPPING_MODE_VALUES })
  @IsOptional()
  @IsIn(SHOPPING_MODE_VALUES)
  shopping_mode?: string;

  @ApiPropertyOptional({ enum: RECIPE_DISCOVERY_SOURCE_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(RECIPE_DISCOVERY_SOURCE_VALUES, { each: true })
  recipe_discovery_sources?: string[];

  @ApiPropertyOptional({ enum: BIGGEST_COOKING_FRUSTRATION_VALUES })
  @IsOptional()
  @IsIn(BIGGEST_COOKING_FRUSTRATION_VALUES)
  biggest_cooking_frustration?: string;
}
