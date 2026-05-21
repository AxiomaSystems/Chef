import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token' })
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  refresh_token!: string;
}
