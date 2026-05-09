import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { InventoryReviewStatus } from '@cart/shared';

export class UpdateKitchenInventoryItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  display_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @IsOptional()
  @IsIn(['pending', 'active', 'discarded', 'archived'])
  review_status?: InventoryReviewStatus | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string | null;
}
