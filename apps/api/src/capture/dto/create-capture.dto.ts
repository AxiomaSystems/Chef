import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import type { CaptureInputKind } from '@cart/shared';

export class CreateCaptureDto {
  @ApiPropertyOptional({ enum: ['url', 'text', 'image'], example: 'url' })
  @IsOptional()
  @IsIn(['url', 'text', 'image'])
  input_kind?: CaptureInputKind;

  @ApiPropertyOptional({ example: 'https://www.youtube.com/watch?v=abc123' })
  @IsOptional()
  @IsUrl({
    require_tld: true,
    require_protocol: true,
  })
  url?: string;

  @ApiPropertyOptional({
    example:
      'Saw a spicy rigatoni with tomato cream sauce, basil, parmesan, and chili flakes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  text?: string;

  @ApiPropertyOptional({
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
    description:
      'Compressed image data URL for image captures. Used ephemerally for AI structuring and not persisted raw.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8_000_000)
  image_data_url?: string;
}
