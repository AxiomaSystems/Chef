import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { BaseRecipe, Capture } from '@cart/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequestActorGuard } from '../auth/request-actor.guard';
import { CaptureService } from './capture.service';
import { CreateCaptureDto } from './dto/create-capture.dto';

@ApiTags('captures')
@ApiBearerAuth()
@UseGuards(RequestActorGuard)
@Controller('api/v1/captures')
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Creates a Chef Capture draft for user review.',
  })
  createCapture(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateCaptureDto,
  ): Promise<Capture> {
    return this.captureService.createCapture(user.sub, input);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Returns a persisted Chef Capture draft.' })
  getCapture(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Capture> {
    return this.captureService.getCapture(user.sub, id);
  }

  @Post(':id/save-recipe')
  @ApiCreatedResponse({
    description: 'Saves a reviewed Chef Capture draft as a user-owned recipe.',
  })
  saveCaptureAsRecipe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BaseRecipe> {
    return this.captureService.saveCaptureAsRecipe(user.sub, id);
  }
}
