import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListRecipesQueryDto {
  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous recipe list page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  cursor?: string;

  @ApiPropertyOptional({ example: 'okra tomato stew' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ example: 'cuisine-west-african' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cuisine_id?: string;

  @ApiPropertyOptional({ example: 'tag-high-protein' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag_id?: string;

  @ApiPropertyOptional({ enum: ['public', 'mine', 'saved'] })
  @IsOptional()
  @IsIn(['public', 'mine', 'saved'])
  owner?: 'public' | 'mine' | 'saved';
}
