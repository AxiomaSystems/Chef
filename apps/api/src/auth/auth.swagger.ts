import { applyDecorators } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AddPasswordDto } from './dto/add-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RemovePasswordDto } from './dto/remove-password.dto';
import { UnlinkGoogleDto } from './dto/unlink-google.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

export const ApiAuthController = () => applyDecorators(ApiTags('auth'));

export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({ summary: 'Register with email and password' }),
    ApiBody({ type: RegisterDto }),
    ApiAcceptedResponse({
      description:
        'Returns the same verification-required response whether or not the email already exists.',
    }),
  );

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login with email and password' }),
    ApiBody({ type: LoginDto }),
    ApiOkResponse({ description: 'Returns access and refresh tokens.' }),
    ApiUnauthorizedResponse({ description: 'Invalid credentials.' }),
    ApiForbiddenResponse({ description: 'Email verification is required.' }),
  );

export const ApiGoogleLogin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login or sign in with Google ID token' }),
    ApiBody({ type: GoogleLoginDto }),
    ApiOkResponse({ description: 'Returns access and refresh tokens.' }),
    ApiConflictResponse({
      description:
        'The Google email belongs to an account that requires explicit authenticated linking.',
    }),
    ApiUnauthorizedResponse({ description: 'Invalid Google identity.' }),
  );

export const ApiVerifyEmail = () =>
  applyDecorators(
    ApiOperation({ summary: 'Consume an email-verification token' }),
    ApiBody({ type: VerifyEmailDto }),
    ApiOkResponse({ description: 'Email ownership verified.' }),
    ApiBadRequestResponse({
      description: 'The token is invalid, expired, or already consumed.',
    }),
  );

export const ApiRequestPasswordReset = () =>
  applyDecorators(
    ApiOperation({ summary: 'Request a password-reset email' }),
    ApiBody({ type: RequestPasswordResetDto }),
    ApiAcceptedResponse({
      description:
        'Always accepted without disclosing whether the account exists.',
    }),
  );

export const ApiResetPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Consume a password-reset token and revoke existing sessions',
    }),
    ApiBody({ type: ResetPasswordDto }),
    ApiOkResponse({ description: 'Password reset completed.' }),
    ApiBadRequestResponse({
      description: 'The token is invalid, expired, or already consumed.',
    }),
  );

export const ApiLinkGoogle = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Connect Google using a freshly verified Google ID token',
    }),
    ApiBody({ type: GoogleLoginDto }),
    ApiOkResponse({ description: 'Google identity connected.' }),
    ApiForbiddenResponse({ description: 'Reauthentication did not match.' }),
    ApiConflictResponse({ description: 'Google identity is already linked.' }),
  );

export const ApiUnlinkGoogle = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove Google after recent password reauthentication',
    }),
    ApiBody({ type: UnlinkGoogleDto }),
    ApiOkResponse({ description: 'Google identity removed.' }),
    ApiForbiddenResponse({ description: 'Reauthentication failed.' }),
  );

export const ApiAddPassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add password sign-in after Google reauthentication',
    }),
    ApiBody({ type: AddPasswordDto }),
    ApiOkResponse({ description: 'Password identity connected.' }),
    ApiForbiddenResponse({ description: 'Reauthentication failed.' }),
    ApiConflictResponse({ description: 'Password identity already exists.' }),
  );

export const ApiRemovePassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove password sign-in after Google reauthentication',
    }),
    ApiBody({ type: RemovePasswordDto }),
    ApiOkResponse({ description: 'Password identity removed.' }),
    ApiForbiddenResponse({ description: 'Reauthentication failed.' }),
  );

export const ApiRefresh = () =>
  applyDecorators(
    ApiOperation({ summary: 'Rotate refresh token and issue new tokens' }),
    ApiBody({ type: RefreshTokenDto }),
    ApiOkResponse({ description: 'Returns a new access/refresh token pair.' }),
    ApiUnauthorizedResponse({ description: 'Invalid refresh token.' }),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Revoke a refresh token' }),
    ApiBody({ type: RefreshTokenDto }),
    ApiOkResponse({ description: 'Refresh token revoked.' }),
  );
