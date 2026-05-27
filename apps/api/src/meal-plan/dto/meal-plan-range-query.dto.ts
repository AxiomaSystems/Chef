import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MealPlanRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-05-18' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-24' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  to?: string;

  @ApiPropertyOptional({
    example: '2026-05-18',
    description: 'Legacy week start. Must be a Monday.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  week_start?: string;
}
