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
}
