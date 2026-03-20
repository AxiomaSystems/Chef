import { Body, Controller, Get, HttpCode, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiGetMe,
  ApiGetMePreferences,
  ApiGetMeStats,
  ApiMeController,
  ApiCompleteOnboarding,
  ApiUpdateMe,
  ApiUpdateMePreferences,
} from './user.swagger';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMePreferencesDto } from './dto/update-me-preferences.dto';
import { MeService } from './me.service';

@ApiMeController()
@Controller('api/v1/me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiGetMe()
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getProfile(user.sub);
  }

  @Get('stats')
  @ApiGetMeStats()
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getStats(user.sub);
  }

  @Get('preferences')
  @ApiGetMePreferences()
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getPreferences(user.sub);
  }

  @Post('onboarding/complete')
  @HttpCode(200)
  @ApiCompleteOnboarding()
  completeOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.completeOnboarding(user.sub);
  }

  @Patch()
  @ApiUpdateMe()
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateMeDto,
  ) {
    return this.meService.updateProfile(user.sub, input);
  }

  @Put('preferences')
  @ApiUpdateMePreferences()
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateMePreferencesDto,
  ) {
    return this.meService.updatePreferences(user.sub, input);
  }
}
