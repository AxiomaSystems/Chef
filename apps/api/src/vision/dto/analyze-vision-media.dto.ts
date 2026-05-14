import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? value : Number(value);

export class AnalyzeVisionMediaDto {
  @IsOptional()
  @IsIn(['photo', 'video', 'camera'])
  media_kind?: 'photo' | 'video' | 'camera';

  @IsOptional()
  @IsString()
  detector?: string;

  @IsOptional()
  @IsString()
  model_name?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  classify_crops?: boolean;

  @IsOptional()
  @IsString()
  classifier_run?: string;

  @IsOptional()
  @IsString()
  classifier_checkpoint?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(10)
  classifier_top_k?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  classifier_min_confidence?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  classifier_relabel_enabled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  use_full_image_fallback?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  full_image_min_confidence?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  use_grid_fallback?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  grid_max_crops?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.1)
  @Max(0.9)
  grid_crop_fraction?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.2)
  @Max(1)
  grid_stride_fraction?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  grid_min_confidence?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  @Max(50)
  grid_max_additions?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  ocr_enabled?: boolean;

  @IsOptional()
  @IsString()
  ocr_provider?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  ocr_cache_enabled?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  ocr_container_only?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  ocr_min_confidence?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  include_ignored?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(50)
  max_detections_per_frame?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence_threshold?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.1)
  @Max(10)
  sampled_fps?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(60)
  max_frames?: number;
}
