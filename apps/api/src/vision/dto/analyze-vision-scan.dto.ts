import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class VisionBoundingBoxDto {
  @ApiProperty({ example: 0.18 })
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @ApiProperty({ example: 0.12 })
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @ApiProperty({ example: 0.24 })
  @IsNumber()
  @Min(0)
  @Max(1)
  width!: number;

  @ApiProperty({ example: 0.46 })
  @IsNumber()
  @Min(0)
  @Max(1)
  height!: number;
}

export class VisionDebugObjectDto {
  @ApiProperty({ example: 'olive oil bottle' })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ type: () => VisionBoundingBoxDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisionBoundingBoxDto)
  bbox?: VisionBoundingBoxDto;

  @ApiPropertyOptional({ example: 0.94 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class VisionFrameInputDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  frame_id!: number;

  @ApiPropertyOptional({
    example: 'closet_left_top olive oil bottle spice bottle plate',
  })
  @IsOptional()
  @IsString()
  frame_ref?: string;

  @ApiPropertyOptional({ example: 'closet_left_top' })
  @IsOptional()
  @IsString()
  zone_id?: string;

  @ApiPropertyOptional({ example: 1333 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestamp_ms?: number;

  @ApiPropertyOptional({ type: () => [VisionDebugObjectDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => VisionDebugObjectDto)
  debug_objects?: VisionDebugObjectDto[];
}

export class VisionScanOptionsDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  include_ignored?: boolean;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  max_detections_per_frame?: number;
}

export class AnalyzeVisionScanDto {
  @ApiProperty({ example: 'scan_demo_001' })
  @IsString()
  scan_session_id!: string;

  @ApiProperty({ type: () => [VisionFrameInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => VisionFrameInputDto)
  frames!: VisionFrameInputDto[];

  @ApiPropertyOptional({ type: () => VisionScanOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisionScanOptionsDto)
  options?: VisionScanOptionsDto;
}
