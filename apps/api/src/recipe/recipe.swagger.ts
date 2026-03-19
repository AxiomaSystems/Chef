import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiDevUserHeader } from '../common/http/api-headers.swagger';
import {
  BaseRecipeResponseDto,
  ErrorResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  createRecipeRequestExample,
  forbiddenErrorExample,
  notFoundErrorExample,
  recipeExample,
  recipeListExample,
  updateRecipeRequestExample,
} from '../common/http/swagger.examples';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

export const ApiRecipeController = () =>
  applyDecorators(ApiTags('recipes'), ApiDevUserHeader());

export const ApiRecipeForkController = () =>
  applyDecorators(ApiTags('recipe-forks'), ApiDevUserHeader());

export const ApiCreateRecipe = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a user-owned recipe' }),
    ApiBody({
      type: CreateRecipeDto,
      required: true,
      description: 'Recipe payload to persist as a user-owned recipe.',
      examples: {
        basicRecipe: {
          summary: 'Create a full base recipe',
          value: createRecipeRequestExample,
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Created recipe',
      type: BaseRecipeResponseDto,
      content: {
        'application/json': {
          examples: {
            createdRecipe: {
              summary: 'Created user recipe',
              value: recipeExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid recipe payload',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidRecipePayload: {
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

export const ApiListRecipes = () =>
  applyDecorators(
    ApiOperation({ summary: 'List visible recipes for the current user' }),
    ApiOkResponse({
      description: 'Visible recipes',
      type: BaseRecipeResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            visibleRecipes: {
              summary: 'Visible global and owned recipes',
              value: recipeListExample,
            },
          },
        },
      },
    }),
  );

export const ApiGetRecipe = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a single visible recipe by id' }),
    ApiOkResponse({
      description: 'Recipe details',
      type: BaseRecipeResponseDto,
      content: {
        'application/json': {
          examples: {
            recipeDetails: {
              summary: 'Recipe detail response',
              value: recipeExample,
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Recipe was not found or is not visible to the current user',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingRecipe: {
              summary: 'Recipe not found',
              value: notFoundErrorExample,
            },
          },
        },
      },
    }),
  );

export const ApiGetRecipeOrigin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the source recipe for a saved forked recipe' }),
    ApiOkResponse({
      description: 'Origin recipe details',
      type: BaseRecipeResponseDto,
      content: {
        'application/json': {
          examples: {
            originRecipe: {
              summary: 'Source system recipe for a saved user copy',
              value: {
                ...recipeExample,
                id: 'recipe-system-1',
                owner_user_id: undefined,
                forked_from_recipe_id: undefined,
                is_system_recipe: true,
                name: 'Aji de gallina',
              },
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description:
        'Recipe was not found, is not visible, or does not have an origin recipe',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            recipeWithoutOrigin: {
              summary: 'Recipe is not a fork',
              value: {
                statusCode: 404,
                message: 'Recipe recipe-1 does not have an origin recipe',
                error: 'Not Found',
              },
            },
            missingRecipe: {
              summary: 'Recipe not found',
              value: notFoundErrorExample,
            },
          },
        },
      },
    }),
  );

export const ApiUpdateRecipe = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a user-owned non-system recipe' }),
    ApiBody({
      type: UpdateRecipeDto,
      required: true,
      description:
        'Partial recipe update. If `ingredients` or `steps` are provided, send the full replacement array.',
      examples: {
        fullReplacementUpdate: {
          summary: 'Update name, servings, ingredients, and steps',
          value: updateRecipeRequestExample,
        },
        metadataOnlyUpdate: {
          summary: 'Update only metadata fields',
          value: {
            name: 'Arroz con pollo familiar',
            description: 'Renamed recipe without replacing ingredients.',
            cuisine_id: 'cuisine-peruvian',
            tag_ids: ['tag-user-family', 'tag-system-dinner'],
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Updated recipe',
      type: BaseRecipeResponseDto,
      content: {
        'application/json': {
          examples: {
            updatedRecipe: {
              summary: 'Updated recipe response',
              value: {
                ...recipeExample,
                name: 'Arroz con pollo actualizado',
                updated_at: '2026-03-19T03:18:00.000Z',
              },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid recipe update payload',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidRecipeUpdate: {
              summary: 'Validation error',
              value: badRequestErrorExample,
            },
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'System recipes cannot be edited',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            systemRecipeForbidden: {
              summary: 'Cannot edit system recipe',
              value: forbiddenErrorExample,
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Recipe was not found or is not owned by the current user',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingRecipe: {
              summary: 'Recipe not found',
              value: notFoundErrorExample,
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

export const ApiCreateRecipeFork = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create or return a saved editable fork of a system recipe' }),
    ApiCreatedResponse({
      description: 'Created recipe fork',
      type: BaseRecipeResponseDto,
    }),
    ApiOkResponse({
      description: 'Existing recipe fork returned',
      type: BaseRecipeResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'System recipe not found',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingRecipe: {
              summary: 'System recipe not found',
              value: notFoundErrorExample,
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

export const ApiDeleteRecipe = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a user-owned non-system recipe' }),
    ApiNoContentResponse({ description: 'Recipe deleted' }),
    ApiForbiddenResponse({
      description: 'System recipes cannot be deleted',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            systemRecipeForbidden: {
              summary: 'Cannot delete system recipe',
              value: {
                statusCode: 403,
                message: 'System recipes cannot be deleted',
                error: 'Forbidden',
              },
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Recipe was not found or is not owned by the current user',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingRecipe: {
              summary: 'Recipe not found',
              value: notFoundErrorExample,
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
