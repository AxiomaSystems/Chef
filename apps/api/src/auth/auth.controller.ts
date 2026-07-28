import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import {
  ApiAuthController,
  ApiAddPassword,
  ApiGoogleLogin,
  ApiLinkGoogle,
  ApiLogin,
  ApiLogout,
  ApiRequestPasswordReset,
  ApiRemovePassword,
  ApiResetPassword,
  ApiRefresh,
  ApiRegister,
  ApiVerifyEmail,
  ApiUnlinkGoogle,
} from './auth.swagger';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AddPasswordDto } from './dto/add-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RemovePasswordDto } from './dto/remove-password.dto';
import { UnlinkGoogleDto } from './dto/unlink-google.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestActorGuard } from './request-actor.guard';
import type { AuthenticatedUser } from './auth.types';

@ApiAuthController()
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(202)
  @UseGuards(AuthRateLimitGuard)
  @ApiRegister()
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Post('email-verifications')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @ApiVerifyEmail()
  verifyEmail(@Body() input: VerifyEmailDto) {
    return this.authService.verifyEmail(input.token);
  }

  @Post('password-reset-requests')
  @HttpCode(202)
  @UseGuards(AuthRateLimitGuard)
  @ApiRequestPasswordReset()
  requestPasswordReset(@Body() input: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Post('password-resets')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @ApiResetPassword()
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input);
  }

  @Post('identities/google')
  @HttpCode(200)
  @UseGuards(RequestActorGuard)
  @ApiLinkGoogle()
  linkGoogle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: GoogleLoginDto,
  ) {
    return this.authService.linkGoogle(user.sub, input);
  }

  @Delete('identities/google')
  @HttpCode(200)
  @UseGuards(RequestActorGuard)
  @ApiUnlinkGoogle()
  unlinkGoogle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UnlinkGoogleDto,
  ) {
    return this.authService.unlinkGoogle(user.sub, input);
  }

  @Post('identities/password')
  @HttpCode(200)
  @UseGuards(RequestActorGuard)
  @ApiAddPassword()
  addPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AddPasswordDto,
  ) {
    return this.authService.addPassword(user.sub, input);
  }

  @Delete('identities/password')
  @HttpCode(200)
  @UseGuards(RequestActorGuard)
  @ApiRemovePassword()
  removePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: RemovePasswordDto,
  ) {
    return this.authService.removePassword(user.sub, input);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @ApiLogin()
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Post('google')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @ApiGoogleLogin()
  loginWithGoogle(@Body() input: GoogleLoginDto) {
    return this.authService.loginWithGoogle(input);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @ApiRefresh()
  refresh(@Body() input: RefreshTokenDto) {
    return this.authService.refresh(input);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(RequestActorGuard)
  @ApiLogout()
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: RefreshTokenDto,
  ) {
    return this.authService.logout(user.sub, input);
  }
}
