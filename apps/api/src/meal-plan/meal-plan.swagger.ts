import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  MealPlanResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  mealPlanExample,
  updateMealPlanRequestExample,
} from '../common/http/swagger.examples';
import { CreateMealPlanCartDto } from './dto/create-meal-plan-cart.dto';
import { CreateMealEventDto, UpdateMealEventDto } from './dto/meal-event.dto';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';

export const ApiMealPlanController = () =>
  applyDecorators(ApiTags('meal-plans'));

const weekStartQuery = ApiQuery({
  name: 'week_start',
  required: true,
  example: '2026-04-20',
  description:
    'Monday date for the requested meal-plan week in YYYY-MM-DD format.',
});

export const ApiGetMealPlan = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the current user meal plan for a date range',
    }),
    ApiQuery({
      name: 'from',
      required: false,
      example: '2026-05-18',
      description: 'Range start in YYYY-MM-DD format.',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      example: '2026-05-24',
      description: 'Range end in YYYY-MM-DD format.',
    }),
    ApiQuery({
      name: 'week_start',
      required: false,
      example: '2026-05-18',
      description: 'Legacy Monday date for a rigid weekly plan response.',
    }),
    ApiOkResponse({
      description: 'Meal plan for the requested week',
      type: MealPlanResponseDto,
      content: {
        'application/json': {
          examples: {
            weekPlan: {
              summary: 'Weekly meal plan',
              value: mealPlanExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid week_start value',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidWeek: {
              summary: 'Validation error',
              value: badRequestErrorExample,
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

export const ApiGetMealEvents = () =>
  applyDecorators(
    ApiOperation({ summary: 'List flexible meal events for a date range' }),
    ApiQuery({ name: 'from', required: true, example: '2026-05-18' }),
    ApiQuery({ name: 'to', required: true, example: '2026-05-24' }),
    ApiOkResponse({ description: 'Meal events for the requested range' }),
    ApiBadRequestResponse({ type: ErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );

export const ApiCreateMealEvent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a flexible meal event' }),
    ApiBody({ type: CreateMealEventDto }),
    ApiCreatedResponse({ description: 'Created meal event' }),
    ApiBadRequestResponse({ type: ErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );

export const ApiUpdateMealEvent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a flexible meal event' }),
    ApiBody({ type: UpdateMealEventDto }),
    ApiOkResponse({ description: 'Updated meal event' }),
    ApiBadRequestResponse({ type: ErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );

export const ApiDeleteMealEvent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a flexible meal event' }),
    ApiNoContentResponse({ description: 'Meal event deleted' }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );

export const ApiCreateMealPlanCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create the active cart from planned meals' }),
    ApiBody({ type: CreateMealPlanCartDto }),
    ApiCreatedResponse({ description: 'Active cart generated from meal plan' }),
    ApiBadRequestResponse({ type: ErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );

export const ApiUpsertMealPlan = () =>
  applyDecorators(
    ApiOperation({ summary: 'Replace the current user meal plan for a week' }),
    weekStartQuery,
    ApiBody({
      type: UpsertMealPlanDto,
      required: true,
      examples: {
        mealPlanUpdate: {
          summary: 'Replace a week plan',
          value: updateMealPlanRequestExample,
        },
      },
    }),
    ApiOkResponse({
      description: 'Updated meal plan for the requested week',
      type: MealPlanResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid week_start value or invalid recipe references',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );
