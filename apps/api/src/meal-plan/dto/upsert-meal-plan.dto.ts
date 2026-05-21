import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class MealPlanDayDto {
  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breakfast?: string;

  @ApiPropertyOptional({ example: 'recipe-2' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lunch?: string;

  @ApiPropertyOptional({ example: 'recipe-3' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  dinner?: string;
}

export class UpsertMealPlanDto {
  @ApiPropertyOptional({
    type: () => [MealPlanDayDto],
    description: 'Exactly seven day slots from Monday through Sunday.',
  })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => MealPlanDayDto)
  days!: MealPlanDayDto[];
}
