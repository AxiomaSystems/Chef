import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { BaseRecipe } from '@cart/shared';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
import { RecipeService } from './recipe.service';

@ApiTags('recipes')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Optional dev-only actor override header.',
  example: 'user-1',
})
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user-owned recipe' })
  @ApiBody({
    type: CreateRecipeDto,
    required: true,
    description: 'Recipe payload to persist as a user-owned recipe.',
    examples: {
      basicRecipe: {
        summary: 'Create a full base recipe',
        value: createRecipeRequestExample,
      },
    },
  })
  @ApiOkResponse({
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
  })
  @ApiBadRequestResponse({
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
  })
  create(
    @Body() input: CreateRecipeDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.create(input, actorUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List visible recipes for the current user' })
  @ApiOkResponse({
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
  })
  findAll(@Headers('x-user-id') actorUserId?: string): Promise<BaseRecipe[]> {
    return this.recipeService.findAll(actorUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single visible recipe by id' })
  @ApiOkResponse({
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
  })
  @ApiNotFoundResponse({
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
  })
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.findOne(id, actorUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user-owned non-system recipe' })
  @ApiBody({
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
          tags: ['family', 'dinner'],
        },
      },
    },
  })
  @ApiOkResponse({
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
  })
  @ApiBadRequestResponse({
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
  })
  @ApiForbiddenResponse({
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
  })
  @ApiNotFoundResponse({
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
  })
  update(
    @Param('id') id: string,
    @Body() input: UpdateRecipeDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<BaseRecipe> {
    return this.recipeService.update(id, input, actorUserId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user-owned non-system recipe' })
  @ApiNoContentResponse({ description: 'Recipe deleted' })
  @ApiForbiddenResponse({
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
  })
  @ApiNotFoundResponse({
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
  })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<void> {
    await this.recipeService.remove(id, actorUserId);
  }
}
