import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiChangePassword,
  ApiGetMe,
  ApiGetMePreferences,
  ApiGetProfileMemory,
  ApiGetCheckoutProfile,
  ApiGetMeStats,
  ApiMeController,
  ApiCompleteOnboarding,
  ApiSetPassword,
  ApiUpdateMe,
  ApiUpdateCheckoutProfile,
  ApiUpdateMePreferences,
  ApiUpdateProfileMemory,
} from './user.swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateCheckoutProfileDto } from './dto/update-checkout-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMePreferencesDto } from './dto/update-me-preferences.dto';
import { UpdateProfileMemoryDto } from './dto/update-profile-memory.dto';
import { MeService } from './me.service';
import { ProfileMemoryService } from './profile-memory.service';

@ApiMeController()
@Controller('api/v1/me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly profileMemoryService: ProfileMemoryService,
  ) {}

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

  @Get('profile-memory')
  @ApiGetProfileMemory()
  getProfileMemory(@CurrentUser() user: AuthenticatedUser) {
    return this.profileMemoryService.getProfileMemory(user.sub);
  }

  @Get('checkout-profile')
  @ApiGetCheckoutProfile()
  getCheckoutProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.getCheckoutProfile(user.sub);
  }

  @Post('onboarding/complete')
  @HttpCode(200)
  @ApiCompleteOnboarding()
  completeOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.meService.completeOnboarding(user.sub);
  }

  @Patch()
  @ApiUpdateMe()
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateMeDto) {
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

  @Patch('profile-memory')
  @ApiUpdateProfileMemory()
  updateProfileMemory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateProfileMemoryDto,
  ) {
    return this.profileMemoryService.updateProfileMemory(user.sub, input);
  }

  @Put('checkout-profile')
  @ApiUpdateCheckoutProfile()
  updateCheckoutProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateCheckoutProfileDto,
  ) {
    return this.meService.updateCheckoutProfile(user.sub, input);
  }
}
