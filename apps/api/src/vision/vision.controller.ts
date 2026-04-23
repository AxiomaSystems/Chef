import { Body, Controller, Get, Post } from '@nestjs/common';
import type { VisionPipelineConfig, VisionScanResponse } from '@cart/shared';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';
import {
  ApiAnalyzeVisionScan,
  ApiDescribeVisionPipeline,
  ApiVisionController,
} from './vision.swagger';
import { VisionService } from './vision.service';

@ApiVisionController()
@Controller('api/v1/vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Get('pipeline')
  @ApiDescribeVisionPipeline()
  describePipeline(): VisionPipelineConfig {
    return this.visionService.describePipeline();
  }

  @Post('detect')
  @ApiAnalyzeVisionScan()
  analyzeScan(@Body() input: AnalyzeVisionScanDto): Promise<VisionScanResponse> {
    return this.visionService.analyzeScan(input);
  }
}
