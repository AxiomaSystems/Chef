import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnlinkGoogleDto {
  @ApiProperty({
    description: 'Current password used for recent reauthentication.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
