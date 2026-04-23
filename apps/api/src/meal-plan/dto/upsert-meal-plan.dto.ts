import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class MealPlanDayDto {
  @ApiPropertyOptional({ example: 'recipe-1' })
  @IsOptional()
  @IsString()
  breakfast?: string;

  @ApiPropertyOptional({ example: 'recipe-2' })
  @IsOptional()
  @IsString()
  lunch?: string;

  @ApiPropertyOptional({ example: 'recipe-3' })
  @IsOptional()
  @IsString()
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
