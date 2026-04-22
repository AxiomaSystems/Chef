import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class AddKitchenInventoryItemDto {
  @ValidateIf((input: AddKitchenInventoryItemDto) => !input.canonical_name)
  @IsString()
  @MaxLength(128)
  ingredient_id?: string;

  @ValidateIf((input: AddKitchenInventoryItemDto) => !input.ingredient_id)
  @IsString()
  @MaxLength(120)
  canonical_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
