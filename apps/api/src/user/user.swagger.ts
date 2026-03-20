import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  MeResponseDto,
  UserPreferencesResponseDto,
  UserStatsResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  forbiddenErrorExample,
  meProfileExample,
  mePreferencesExample,
  meStatsExample,
  updateMePreferencesRequestExample,
} from '../common/http/swagger.examples';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMePreferencesDto } from './dto/update-me-preferences.dto';

export const ApiMeController = () => applyDecorators(ApiTags('me'));

export const ApiGetMe = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get the current authenticated user profile' }),
    ApiOkResponse({
      description: 'Returns the authenticated user profile.',
      type: MeResponseDto,
      content: {
        'application/json': {
          examples: {
            meProfile: {
              summary: 'Authenticated user profile',
              value: meProfileExample,
            },
          },
        },
      },
    }),
  );

export const ApiGetMeStats = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get simple counters for the current authenticated user' }),
    ApiOkResponse({
      description: 'Returns lightweight account counters for the authenticated user.',
      type: UserStatsResponseDto,
      content: {
        'application/json': {
          examples: {
            meStats: {
              summary: 'Account counters',
              value: meStatsExample,
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiUpdateMe = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update the current authenticated user profile' }),
    ApiBody({ type: UpdateMeDto }),
    ApiOkResponse({
      description: 'Returns the updated user profile.',
      type: MeResponseDto,
    }),
  );

export const ApiChangePassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Change the password for the current authenticated user when a password identity already exists',
    }),
    ApiBody({ type: ChangePasswordDto }),
    ApiOkResponse({
      description: 'Password changed successfully.',
      schema: {
        example: {
          success: true,
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid payload or the new password matches the current password.',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            samePassword: {
              summary: 'New password matches current password',
              value: {
                ...badRequestErrorExample,
                message: 'New password must be different from the current password',
              },
            },
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'The account does not have a password identity yet.',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            passwordMissing: {
              summary: 'Password identity missing',
              value: {
                ...forbiddenErrorExample,
                message: 'This account does not have a password identity yet',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required or current password incorrect.',
      type: ErrorResponseDto,
    }),
  );

export const ApiSetPassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Set a password for the current authenticated user when the account is currently Google-only',
    }),
    ApiBody({ type: SetPasswordDto }),
    ApiOkResponse({
      description: 'Password set successfully.',
      schema: {
        example: {
          success: true,
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'The account already has a password identity.',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            passwordAlreadyExists: {
              summary: 'Password identity already exists',
              value: {
                ...forbiddenErrorExample,
                message: 'This account already has a password identity',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiCompleteOnboarding = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Mark onboarding as completed for the current authenticated user',
    }),
    ApiOkResponse({
      description: 'Returns the updated user profile with onboarding completion.',
      type: MeResponseDto,
      content: {
        'application/json': {
          examples: {
            completedOnboarding: {
              summary: 'Onboarding completed',
              value: meProfileExample,
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiGetMePreferences = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get the current authenticated user preferences' }),
    ApiOkResponse({
      description:
        'Returns onboarding and preference selections for the authenticated user.',
      type: UserPreferencesResponseDto,
      content: {
        'application/json': {
          examples: {
            mePreferences: {
              summary: 'Current preferences',
              value: mePreferencesExample,
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiUpdateMePreferences = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Replace the current authenticated user preferences' }),
    ApiBody({
      type: UpdateMePreferencesDto,
      required: true,
      examples: {
        replacePreferences: {
          summary: 'Replace cuisines and tags',
          value: updateMePreferencesRequestExample,
        },
      },
    }),
    ApiOkResponse({
      description: 'Returns the updated preferences.',
      type: UserPreferencesResponseDto,
      content: {
        'application/json': {
          examples: {
            updatedPreferences: {
              summary: 'Updated preferences',
              value: mePreferencesExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid cuisine or tag ids, or duplicate ids.',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidPreferences: {
              summary: 'Validation error',
              value: badRequestErrorExample,
            },
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Only shared system tags are currently allowed in preferences.',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            forbiddenTag: {
              summary: 'User tag not allowed',
              value: {
                ...forbiddenErrorExample,
                message: 'Preferences currently support only shared system tags',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );
