import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  USER_FOOD_RULE_ACTION_VALUES,
  USER_FOOD_RULE_KIND_VALUES,
  USER_GOAL_KIND_VALUES,
  USER_GOAL_TIMEFRAME_VALUES,
  USER_MEMORY_CONFIDENCE_VALUES,
  USER_MEMORY_SOURCE_VALUES,
  USER_RULE_STRICTNESS_VALUES,
  AVAILABLE_APPLIANCE_VALUES,
  BIGGEST_COOKING_FRUSTRATION_VALUES,
  CALORIE_TRACKING_MODE_VALUES,
  COOKING_SKILL_LEVEL_VALUES,
  FAVORITE_FLAVOR_VALUES,
  FAVORITE_PROTEIN_VALUES,
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

export class ProfileMemoryShoppingLocationPatchDto {
  @IsOptional()
  @IsString()
  zip_code?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  kroger_location_id?: string;
}

export class ProfileMemoryWeeklyNutritionTargetsPatchDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein_g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs_g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat_g?: number;
}

export class ProfileMemoryPreferencesPatchDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  preferred_cuisine_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  preferred_tag_ids?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileMemoryShoppingLocationPatchDto)
  shopping_location?: ProfileMemoryShoppingLocationPatchDto;

  @IsOptional()
  @IsIn(HOUSEHOLD_SIZE_VALUES)
  household_size?: (typeof HOUSEHOLD_SIZE_VALUES)[number];

  @IsOptional()
  @IsIn(KIDS_PROFILE_VALUES)
  kids_profile?: (typeof KIDS_PROFILE_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(FAVORITE_PROTEIN_VALUES, { each: true })
  favorite_proteins?: Array<(typeof FAVORITE_PROTEIN_VALUES)[number]>;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(FAVORITE_FLAVOR_VALUES, { each: true })
  favorite_flavors?: Array<(typeof FAVORITE_FLAVOR_VALUES)[number]>;

  @IsOptional()
  @IsIn(SPICE_LEVEL_VALUES)
  spice_level?: (typeof SPICE_LEVEL_VALUES)[number];

  @IsOptional()
  @IsIn(COOKING_SKILL_LEVEL_VALUES)
  cooking_skill_level?: (typeof COOKING_SKILL_LEVEL_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(AVAILABLE_APPLIANCE_VALUES, { each: true })
  available_appliances?: Array<(typeof AVAILABLE_APPLIANCE_VALUES)[number]>;

  @IsOptional()
  @IsIn(PREFERRED_COOKING_TIME_VALUES)
  preferred_cooking_time?: (typeof PREFERRED_COOKING_TIME_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(TYPICAL_MEAL_TIME_VALUES, { each: true })
  typical_meal_times?: Array<(typeof TYPICAL_MEAL_TIME_VALUES)[number]>;

  @IsOptional()
  @IsIn(CALORIE_TRACKING_MODE_VALUES)
  calorie_tracking_mode?: (typeof CALORIE_TRACKING_MODE_VALUES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileMemoryWeeklyNutritionTargetsPatchDto)
  weekly_nutrition_targets?: ProfileMemoryWeeklyNutritionTargetsPatchDto;

  @IsOptional()
  @IsIn(WEEKLY_BUDGET_VALUES)
  weekly_budget?: (typeof WEEKLY_BUDGET_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PREFERRED_STORE_VALUES, { each: true })
  preferred_stores?: Array<(typeof PREFERRED_STORE_VALUES)[number]>;

  @IsOptional()
  @IsIn(SHOPPING_MODE_VALUES)
  shopping_mode?: (typeof SHOPPING_MODE_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(RECIPE_DISCOVERY_SOURCE_VALUES, { each: true })
  recipe_discovery_sources?: Array<
    (typeof RECIPE_DISCOVERY_SOURCE_VALUES)[number]
  >;

  @IsOptional()
  @IsIn(BIGGEST_COOKING_FRUSTRATION_VALUES)
  biggest_cooking_frustration?: (typeof BIGGEST_COOKING_FRUSTRATION_VALUES)[number];
}

export class UpsertUserFoodRuleDto {
  @ApiPropertyOptional({
    description: 'Existing rule id. Natural-key upsert is used when omitted.',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(USER_FOOD_RULE_KIND_VALUES)
  kind!: (typeof USER_FOOD_RULE_KIND_VALUES)[number];

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  ingredient_id?: string;

  @IsOptional()
  @IsString()
  tag_id?: string;

  @IsIn(USER_FOOD_RULE_ACTION_VALUES)
  action!: (typeof USER_FOOD_RULE_ACTION_VALUES)[number];

  @IsIn(USER_RULE_STRICTNESS_VALUES)
  strictness!: (typeof USER_RULE_STRICTNESS_VALUES)[number];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsIn(USER_MEMORY_SOURCE_VALUES)
  source?: (typeof USER_MEMORY_SOURCE_VALUES)[number];

  @IsOptional()
  @IsIn(USER_MEMORY_CONFIDENCE_VALUES)
  confidence?: (typeof USER_MEMORY_CONFIDENCE_VALUES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertUserGoalDto {
  @ApiPropertyOptional({
    description: 'Existing goal id. Natural-key upsert is used when omitted.',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(USER_GOAL_KIND_VALUES)
  goal!: (typeof USER_GOAL_KIND_VALUES)[number];

  @IsInt()
  @Min(1)
  @Max(5)
  priority!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsIn(USER_GOAL_TIMEFRAME_VALUES)
  timeframe?: (typeof USER_GOAL_TIMEFRAME_VALUES)[number];

  @IsOptional()
  @IsIn(USER_MEMORY_SOURCE_VALUES)
  source?: (typeof USER_MEMORY_SOURCE_VALUES)[number];

  @IsOptional()
  @IsIn(USER_MEMORY_CONFIDENCE_VALUES)
  confidence?: (typeof USER_MEMORY_CONFIDENCE_VALUES)[number];
}

export class UpdateProfileMemoryDto {
  @ApiPropertyOptional({ type: ProfileMemoryPreferencesPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileMemoryPreferencesPatchDto)
  preferences?: ProfileMemoryPreferencesPatchDto;

  @ApiPropertyOptional({ type: [UpsertUserFoodRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertUserFoodRuleDto)
  food_rules?: UpsertUserFoodRuleDto[];

  @ApiPropertyOptional({ type: [UpsertUserGoalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertUserGoalDto)
  goals?: UpsertUserGoalDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'When present, replaces the full rough pantry staple set for the user.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  pantry_staple_ingredient_ids?: string[];
}
