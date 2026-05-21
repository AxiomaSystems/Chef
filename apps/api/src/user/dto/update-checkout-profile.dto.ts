import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class SavedAddressDto {
  @ApiProperty({ example: 'address-1' })
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: '2 E South Street' })
  @IsString()
  @MaxLength(160)
  street!: string;

  @ApiProperty({ example: 'Galesburg' })
  @IsString()
  @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'IL' })
  @IsString()
  @Length(0, 2)
  state!: string;

  @ApiProperty({ example: '61401' })
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{5}(-\d{4})?$/)
  zip!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault!: boolean;
}

class PaymentCardDto {
  @ApiProperty({ example: 'card-1' })
  @IsString()
  @MaxLength(80)
  id!: string;

  @ApiProperty({ example: 'Visa' })
  @IsString()
  @IsIn(['Visa', 'Mastercard', 'Amex', 'Discover'])
  cardType!: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';

  @ApiProperty({ example: '2222' })
  @IsString()
  @Length(4, 4)
  lastFour!: string;

  @ApiProperty({ example: '07/28' })
  @IsString()
  @MaxLength(5)
  @Matches(/^\d{2}\/\d{2}$/)
  expiry!: string;

  @ApiProperty({ example: 'Tioluwani Enoch Olubunmi' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault!: boolean;
}

export class UpdateCheckoutProfileDto {
  @ApiProperty({ type: () => [SavedAddressDto] })
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SavedAddressDto)
  saved_addresses!: SavedAddressDto[];

  @ApiProperty({ type: () => [PaymentCardDto] })
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => PaymentCardDto)
  payment_cards!: PaymentCardDto[];
}
