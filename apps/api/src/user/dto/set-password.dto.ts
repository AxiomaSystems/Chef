import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ example: 'new-s3cure-passphrase' })
  @IsString()
  @MinLength(8)
  new_password!: string;
}
