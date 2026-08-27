import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RemovePasswordDto {
  @ApiProperty({ description: 'Fresh Google ID token for reauthentication.' })
  @IsString()
  @MinLength(1)
  id_token!: string;
}
