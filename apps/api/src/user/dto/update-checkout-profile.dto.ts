import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

class SavedAddressDto {
  @ApiProperty({ example: 'address-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  label!: string;

  @ApiProperty({ example: '2 E South Street' })
  @IsString()
  street!: string;

  @ApiProperty({ example: 'Galesburg' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'IL' })
  @IsString()
  @Length(0, 2)
  state!: string;

  @ApiProperty({ example: '61401' })
  @IsString()
  zip!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault!: boolean;
}

class PaymentCardDto {
  @ApiProperty({ example: 'card-1' })
  @IsString()
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
  expiry!: string;

  @ApiProperty({ example: 'Tioluwani Enoch Olubunmi' })
  @IsString()
  name!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault!: boolean;
}

export class UpdateCheckoutProfileDto {
  @ApiProperty({ type: () => [SavedAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedAddressDto)
  saved_addresses!: SavedAddressDto[];

  @ApiProperty({ type: () => [PaymentCardDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentCardDto)
  payment_cards!: PaymentCardDto[];
}
