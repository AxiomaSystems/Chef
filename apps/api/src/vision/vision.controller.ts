import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { VisionObservation } from '@cart/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { AddVisionObservationToInventoryDto } from './dto/add-vision-observation-to-inventory.dto';
import { CreateVisionObservationDto } from './dto/create-vision-observation.dto';
import {
  ApiAddVisionObservationToInventory,
  ApiCreateVisionObservation,
  ApiDiscardVisionObservation,
  ApiListVisionObservations,
  ApiVisionController,
} from './vision.swagger';
import { VisionService } from './vision.service';

@Controller('api/v1/vision')
@UseGuards(RequestActorGuard)
@ApiVisionController()
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

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
}
