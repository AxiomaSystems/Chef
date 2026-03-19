import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDevUserHeader } from '../common/http/api-headers.swagger';
import {
  ErrorResponseDto,
  GenerateCartResponseDto,
  GeneratedCartHistorySummaryResponseDto,
  GeneratedCartResponseDto,
  PersistedCartDraftResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  cartDraftExample,
  createCartDraftRequestExample,
  generateCartRequestExample,
  generatedCartExample,
  generatedCartHistoryExample,
  generatedCartListExample,
  persistedGeneratedCartExample,
} from '../common/http/swagger.examples';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { GenerateCartDto } from './dto/generate-cart.dto';

export const ApiCartController = () =>
  applyDecorators(ApiTags('cart'), ApiDevUserHeader());

export const ApiGenerateCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Generate and persist a cart from recipe selections' }),
    ApiBody({
      type: GenerateCartDto,
      required: true,
      description:
        'Recipe selections to aggregate, match, and persist as a generated cart.',
      examples: {
        simpleCartGeneration: {
          summary: 'Generate a cart from one base recipe',
          value: generateCartRequestExample,
        },
        scaledCartGeneration: {
          summary: 'Generate a cart with quantity and serving override',
          value: {
            selections: [
              {
                recipe_id: 'recipe-1',
                recipe_type: 'base',
                quantity: 3,
                servings_override: 6,
              },
            ],
            retailer: 'walmart',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Generated cart response',
      type: GenerateCartResponseDto,
      content: {
        'application/json': {
          examples: {
            generatedCart: {
              summary: 'Generated cart with matching and subtotal',
              value: generatedCartExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Selections are invalid or contain unavailable recipes',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidSelections: {
              summary: 'Recipe unavailable to current user',
              value: {
                statusCode: 400,
                message: 'Recipe missing-recipe is not available to this user',
                error: 'Bad Request',
              },
            },
            invalidPayload: {
              summary: 'Validation error',
              value: badRequestErrorExample,
            },
          },
        },
      },
    }),
  );

export const ApiCreateCartDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'Persist a cart draft' }),
    ApiBody({
      type: CreateCartDraftDto,
      required: true,
      description: 'Draft payload to save for later cart generation.',
      examples: {
        weeklyDraft: {
          summary: 'Persist a weekly dinner draft',
          value: createCartDraftRequestExample,
        },
      },
    }),
    ApiOkResponse({
      description: 'Persisted cart draft',
      type: PersistedCartDraftResponseDto,
      content: {
        'application/json': {
          examples: {
            persistedDraft: {
              summary: 'Persisted cart draft',
              value: cartDraftExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid cart draft payload',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidCartDraft: {
              summary: 'Validation error',
              value: badRequestErrorExample,
            },
          },
        },
      },
    }),
  );

export const ApiListCartDrafts = () =>
  applyDecorators(
    ApiOperation({ summary: 'List persisted cart drafts for the current user' }),
    ApiOkResponse({
      description: 'Persisted cart drafts',
      type: PersistedCartDraftResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            draftList: {
              summary: 'Persisted draft list',
              value: [cartDraftExample],
            },
          },
        },
      },
    }),
  );

export const ApiGetCartDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a persisted cart draft by id' }),
    ApiOkResponse({
      description: 'Persisted cart draft',
      type: PersistedCartDraftResponseDto,
      content: {
        'application/json': {
          examples: {
            draftDetails: {
              summary: 'Single draft',
              value: cartDraftExample,
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Cart draft not found',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingDraft: {
              summary: 'Draft not found',
              value: {
                statusCode: 404,
                message: 'Cart draft draft-404 not found',
                error: 'Not Found',
              },
            },
          },
        },
      },
    }),
  );

export const ApiListGeneratedCarts = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List full persisted generated carts for the current user',
    }),
    ApiOkResponse({
      description: 'Persisted generated carts',
      type: GeneratedCartResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            generatedCartList: {
              summary: 'Generated cart list',
              value: generatedCartListExample,
            },
          },
        },
      },
    }),
  );

export const ApiListGeneratedCartHistory = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List generated cart history summaries for the current user',
    }),
    ApiOkResponse({
      description: 'Generated cart history summaries',
      type: GeneratedCartHistorySummaryResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            historySummaries: {
              summary: 'Generated cart history summaries',
              value: generatedCartHistoryExample,
            },
            emptyHistory: {
              summary: 'No generated carts yet',
              value: [],
            },
          },
        },
      },
    }),
  );

export const ApiGetGeneratedCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a persisted generated cart by id' }),
    ApiOkResponse({
      description: 'Persisted generated cart',
      type: GeneratedCartResponseDto,
      content: {
        'application/json': {
          examples: {
            generatedCartDetails: {
              summary: 'Persisted generated cart',
              value: persistedGeneratedCartExample,
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Generated cart not found',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            missingGeneratedCart: {
              summary: 'Generated cart not found',
              value: {
                statusCode: 404,
                message: 'Generated cart cart-404 not found',
                error: 'Not Found',
              },
            },
          },
        },
      },
    }),
  );
