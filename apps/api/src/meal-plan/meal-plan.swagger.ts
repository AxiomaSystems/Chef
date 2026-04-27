import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
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
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';

export const ApiMealPlanController = () => applyDecorators(ApiTags('meal-plans'));

const weekStartQuery = ApiQuery({
  name: 'week_start',
  required: true,
  example: '2026-04-20',
  description: 'Monday date for the requested meal-plan week in YYYY-MM-DD format.',
});

export const ApiGetMealPlan = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the current user meal plan for a week' }),
    weekStartQuery,
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
