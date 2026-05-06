import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { VisionPipelineConfig, VisionScanResponse } from '@cart/shared';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { AnalyzeVisionMediaDto } from './dto/analyze-vision-media.dto';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';
import {
  ApiAnalyzeVisionScan,
  ApiDescribeVisionPipeline,
  ApiVisionController,
} from './vision.swagger';
import { type UploadedVisionMedia, VisionService } from './vision.service';

@Controller('api/v1/vision')
@UseGuards(RequestActorGuard)
@ApiVisionController()
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Get('pipeline')
  @ApiDescribeVisionPipeline()
  describePipeline(): VisionPipelineConfig {
    return this.visionService.describePipeline();
  }

  @Post('detect')
  @ApiAnalyzeVisionScan()
  analyzeScan(
    @Body() input: AnalyzeVisionScanDto,
  ): Promise<VisionScanResponse> {
    return this.visionService.analyzeScan(input);
  }

  @Post('detect/media')
  @UseInterceptors(
    FileInterceptor('media', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  analyzeMedia(
    @UploadedFile() file: UploadedVisionMedia | undefined,
    @Body() input: AnalyzeVisionMediaDto,
  ): Promise<VisionScanResponse> {
    return this.visionService.analyzeMedia(file, input);
  }
}
