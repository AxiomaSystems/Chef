import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { GenerateMealPlanCartRequest, Retailer } from '@cart/shared';

export class CreateMealPlanCartDto {
  @ApiProperty({ example: '2026-05-18' })
  @IsString()
  @MaxLength(10)
  from!: string;

  @ApiProperty({ example: '2026-05-24' })
  @IsString()
  @MaxLength(10)
  to!: string;

  @ApiPropertyOptional({ type: () => [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  event_ids?: string[];

  @ApiProperty({ enum: ['walmart', 'kroger', 'instacart'] })
  @IsIn(['walmart', 'kroger', 'instacart'])
  retailer!: Retailer;

  @ApiPropertyOptional({ enum: ['replace_active', 'append_active'] })
  @IsOptional()
  @IsIn(['replace_active', 'append_active'])
  mode?: GenerateMealPlanCartRequest['mode'];
}
