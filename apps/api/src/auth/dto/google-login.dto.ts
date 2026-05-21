import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ example: 'google-id-token' })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  id_token!: string;
}
