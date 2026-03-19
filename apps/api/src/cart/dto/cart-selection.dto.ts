import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartSelectionDto {
  @ApiProperty({ example: 'recipe-1' })
  @IsString()
  recipe_id!: string;

  @ApiProperty({ enum: ['base', 'variant'] })
  @IsIn(['base', 'variant'])
  recipe_type!: 'base' | 'variant';

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings_override?: number;
}

export class CartSelectionsDto {
  @ApiProperty({ type: () => [CartSelectionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartSelectionDto)
  selections!: CartSelectionDto[];
}

export class PartialCartSelectionsDto {
  @ApiPropertyOptional({ type: () => [CartSelectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartSelectionDto)
  selections?: CartSelectionDto[];
}
