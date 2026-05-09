import {
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { InventoryReviewStatus } from '@cart/shared';

export class AddKitchenInventoryItemDto {
  @ValidateIf(
    (input: AddKitchenInventoryItemDto) =>
      !input.canonical_name && !input.display_name,
  )
  @IsString()
  @MaxLength(128)
  ingredient_id?: string;

  @ValidateIf(
    (input: AddKitchenInventoryItemDto) =>
      !input.ingredient_id && !input.display_name,
  )
  @IsString()
  @MaxLength(120)
  canonical_name?: string;

  @ValidateIf(
    (input: AddKitchenInventoryItemDto) =>
      !input.ingredient_id && !input.canonical_name,
  )
  @IsString()
  @MaxLength(120)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsIn(['pending', 'active', 'discarded', 'archived'])
  review_status?: InventoryReviewStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string;
}
