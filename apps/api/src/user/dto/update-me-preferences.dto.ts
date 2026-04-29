import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
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

  // ─── New onboarding fields ─────────────────────────────────────────────

  @ApiPropertyOptional({ example: '3–4 people' })
  @IsOptional()
  @IsString()
  household_size?: string;

  @ApiPropertyOptional({ example: 'Yes — kids (5–12)' })
  @IsOptional()
  @IsString()
  kids_profile?: string;

  @ApiPropertyOptional({ example: ['Chicken', 'Beef', 'Salmon'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favorite_proteins?: string[];

  @ApiPropertyOptional({ example: ['Spicy', 'Savory / Umami', 'Sweet'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favorite_flavors?: string[];

  @ApiPropertyOptional({ example: 'Medium heat' })
  @IsOptional()
  @IsString()
  spice_level?: string;

  @ApiPropertyOptional({ example: ['Mushrooms', 'Olives', 'Cilantro'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disliked_ingredients?: string[];

  @ApiPropertyOptional({ example: ['Chewy', 'Crispy'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disliked_textures?: string[];

  @ApiPropertyOptional({ example: 'Intermediate — I improvise sometimes' })
  @IsOptional()
  @IsString()
  cooking_skill_level?: string;

  @ApiPropertyOptional({ example: ['Oven', 'Air fryer', 'Blender'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  available_appliances?: string[];

  @ApiPropertyOptional({ example: '15–30 minutes' })
  @IsOptional()
  @IsString()
  preferred_cooking_time?: string;

  @ApiPropertyOptional({ example: ['Dinner', 'Lunch'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typical_meal_times?: string[];

  @ApiPropertyOptional({ example: ['Save money and stay on budget', 'Eat healthier overall'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goal_priorities?: string[];

  @ApiPropertyOptional({ example: 'Casually — I just stay aware' })
  @IsOptional()
  @IsString()
  calorie_tracking_mode?: string;

  @ApiPropertyOptional({ example: '$50–$100' })
  @IsOptional()
  @IsString()
  weekly_budget?: string;

  @ApiPropertyOptional({ example: ['Kroger', 'Walmart'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_stores?: string[];

  @ApiPropertyOptional({ example: 'I go in-store' })
  @IsOptional()
  @IsString()
  shopping_mode?: string;

  @ApiPropertyOptional({ example: ['Social Media (TikToks, Instagram Reels)', 'YouTube'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipe_discovery_sources?: string[];

  @ApiPropertyOptional({ example: 'I never know what to make' })
  @IsOptional()
  @IsString()
  biggest_cooking_frustration?: string;
}
