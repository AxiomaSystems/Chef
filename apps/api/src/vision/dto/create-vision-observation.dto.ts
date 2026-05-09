import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateVisionObservationDto {
  @ApiProperty({ example: 'bottle' })
  @IsString()
  detected_label!: string;

  @ApiPropertyOptional({ example: 'olive oil bottle' })
  @IsOptional()
  @IsString()
  proposed_name?: string;

  @ApiPropertyOptional({ example: 'olive-oil' })
  @IsOptional()
  @IsString()
  canonical_slug?: string;

  @ApiPropertyOptional({ example: 'yolo-v-next' })
  @IsOptional()
  @IsString()
  detector_model?: string;

  @ApiPropertyOptional({ example: 'resnet18-ingredient-crops' })
  @IsOptional()
  @IsString()
  classifier_model?: string;

  @ApiPropertyOptional({ example: 'yolo-v-next' })
  @IsOptional()
  @IsString()
  model_name?: string;

  @ApiPropertyOptional({ example: 0.82, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ example: 'uploads/scan-1.jpg' })
  @IsOptional()
  @IsString()
  image_ref?: string;

  @ApiPropertyOptional({ example: 'uploads/scan-1-crop-1.jpg' })
  @IsOptional()
  @IsString()
  crop_ref?: string;

  @ApiPropertyOptional({
    example: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  })
  @IsOptional()
  @IsObject()
  bbox?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { source: 'vision-sidecar' } })
  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, unknown>;
}
