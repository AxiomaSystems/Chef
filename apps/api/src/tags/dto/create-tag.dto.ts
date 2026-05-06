import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { TagKind } from '@cart/shared';

export class CreateTagDto {
  @ApiProperty({ example: 'Weeknight' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    example: 'general',
    enum: ['general', 'dietary_badge'],
    required: false,
  })
  @IsOptional()
  @IsIn(['general', 'dietary_badge'])
  kind?: TagKind;
}
