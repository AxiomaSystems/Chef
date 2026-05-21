import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartSelectionDto {
  @ApiProperty({ example: 'recipe-1' })
  @IsString()
  @MaxLength(80)
  recipe_id!: string;

  @ApiProperty({ enum: ['base', 'variant'] })
  @IsIn(['base', 'variant'])
  recipe_type!: 'base' | 'variant';

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings_override?: number;
}

export class CartSelectionsDto {
  @ApiProperty({ type: () => [CartSelectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartSelectionDto)
  selections!: CartSelectionDto[];
}

export class PartialCartSelectionsDto {
  @ApiPropertyOptional({ type: () => [CartSelectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartSelectionDto)
  selections?: CartSelectionDto[];
}
