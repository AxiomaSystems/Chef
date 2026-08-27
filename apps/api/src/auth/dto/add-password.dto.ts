import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddPasswordDto {
  @ApiProperty({ description: 'Fresh Google ID token for reauthentication.' })
  @IsString()
  @MinLength(1)
  id_token!: string;

  @ApiProperty({ example: 'new-s3cure-passphrase' })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
