import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTagDto {
  @ApiProperty({ example: 'Weeknight Dinners' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
