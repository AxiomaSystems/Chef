import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  VisionObservation,
  VisionPipelineConfig,
  VisionScanResponse,
} from '@cart/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { AddVisionObservationToInventoryDto } from './dto/add-vision-observation-to-inventory.dto';
import { AnalyzeVisionMediaDto } from './dto/analyze-vision-media.dto';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';
import { CreateVisionObservationDto } from './dto/create-vision-observation.dto';
import {
  ApiAddVisionObservationToInventory,
  ApiAnalyzeVisionScan,
  ApiCreateVisionObservation,
  ApiDescribeVisionPipeline,
  ApiDiscardVisionObservation,
  ApiListVisionObservations,
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

  @Get('observations')
  @ApiListVisionObservations()
  listObservations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VisionObservation[]> {
    return this.visionService.listObservations(user.sub);
  }

  @Post('observations')
  @ApiCreateVisionObservation()
  createObservation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateVisionObservationDto,
  ): Promise<VisionObservation> {
    return this.visionService.createObservation(user.sub, input);
  }

  @Post('observations/:id/add-to-inventory')
  @ApiAddVisionObservationToInventory()
  addObservationToInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: AddVisionObservationToInventoryDto,
  ): Promise<VisionObservation> {
    return this.visionService.addObservationToInventory(user.sub, id, input);
  }

  @Post('observations/:id/discard')
  @ApiDiscardVisionObservation()
  discardObservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<VisionObservation> {
    return this.visionService.discardObservation(user.sub, id);
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
