import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  Max,
  Min,
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
  @Min(0)
  @Max(10000)
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
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => InventoryAlternativeIngredientDto)
  ingredients!: InventoryAlternativeIngredientDto[];

  @ApiProperty({ type: () => [InventoryAlternativeItemDto] })
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => InventoryAlternativeItemDto)
  inventory!: InventoryAlternativeItemDto[];
}
