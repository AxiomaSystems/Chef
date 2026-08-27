import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use password reset token.' })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  token!: string;

  @ApiProperty({ example: 'new-s3cure-passphrase' })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
