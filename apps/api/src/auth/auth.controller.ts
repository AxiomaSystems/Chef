import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import {
  ApiAuthController,
  ApiGoogleLogin,
  ApiLogin,
  ApiLogout,
  ApiRefresh,
  ApiRegister,
} from './auth.swagger';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestActorGuard } from './request-actor.guard';
import type { AuthenticatedUser } from './auth.types';

@ApiAuthController()
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @ApiRegister()
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
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
