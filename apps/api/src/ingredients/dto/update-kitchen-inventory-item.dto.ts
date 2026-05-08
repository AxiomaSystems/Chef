import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateKitchenInventoryItemDto {
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
