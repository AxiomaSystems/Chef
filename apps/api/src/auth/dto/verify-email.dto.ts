import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Single-use email verification token.' })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  token!: string;
}
