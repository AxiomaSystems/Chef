import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAlternativeIngredientDto {
  @ApiProperty({ example: 'chicken breast' })
  @IsString()
  @MaxLength(200)
  canonical_ingredient!: string;

  @ApiPropertyOptional({ example: 'boneless chicken breast' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  display_ingredient?: string | null;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'lb' })
  @IsString()
  @MaxLength(40)
  unit!: string;
}

export class InventoryAlternativeItemDto {
  @ApiProperty({ example: 'inventory-1' })
  @IsString()
  @MaxLength(120)
  id!: string;

  @ApiProperty({ example: 'turkey breast' })
  @IsString()
  @MaxLength(200)
  display_name!: string;

  @ApiPropertyOptional({ example: 'protein' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;
}

export class InventoryAlternativesDto {
  @ApiProperty({ example: 'Chicken shawarma bowls' })
  @IsString()
  @MaxLength(200)
  recipe_name!: string;

  @ApiProperty({ type: () => [InventoryAlternativeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryAlternativeIngredientDto)
  ingredients!: InventoryAlternativeIngredientDto[];

  @ApiProperty({ type: () => [InventoryAlternativeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryAlternativeItemDto)
  inventory!: InventoryAlternativeItemDto[];
}
