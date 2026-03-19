import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const DEV_USER_ID_HEADER = 'x-user-id';

export const ApiDevUserHeader = () =>
  applyDecorators(
    ApiHeader({
      name: DEV_USER_ID_HEADER,
      required: false,
      description: 'Optional dev-only actor override header.',
      example: 'user-1',
    }),
  );
