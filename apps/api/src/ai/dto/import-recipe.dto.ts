import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ImportRecipeDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=abc123' })
  @IsUrl({
    require_tld: true,
    require_protocol: true,
  })
  url!: string;

  @ApiPropertyOptional({
    example:
      'Creator caption or copied transcript text. Use this when the source page is thin or blocked.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  supplemental_text?: string;
}
