import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'old-s3cure-passphrase' })
  @IsString()
  @MinLength(8)
  current_password!: string;

  @ApiProperty({ example: 'new-s3cure-passphrase' })
  @IsString()
  @MinLength(8)
  new_password!: string;
}
