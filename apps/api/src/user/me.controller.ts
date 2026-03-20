import { Body, Controller, Get, HttpCode, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiChangePassword,
  ApiGetMe,
  ApiGetMePreferences,
  ApiGetMeStats,
  ApiMeController,
  ApiCompleteOnboarding,
  ApiSetPassword,
  ApiUpdateMe,
  ApiUpdateMePreferences,
} from './user.swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
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

  @Post('password/change')
  @HttpCode(200)
  @ApiChangePassword()
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ChangePasswordDto,
  ) {
    return this.meService.changePassword(user.sub, input);
  }

  @Post('password/set')
  @HttpCode(200)
  @ApiSetPassword()
  setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SetPasswordDto,
  ) {
    return this.meService.setPassword(user.sub, input);
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
