import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StructureInventoryContextItemDto {
  @IsString()
  @MaxLength(64)
  id!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  canonical_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string | null;
}

export class StructureInventoryDto {
  @IsString()
  @MaxLength(8000)
  transcript!: string;

  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  allowed_units!: string[];

  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => StructureInventoryContextItemDto)
  inventory!: StructureInventoryContextItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  user_instructions?: string;

  @IsOptional()
  @IsIn(['voice_inventory'])
  source?: 'voice_inventory';
}
