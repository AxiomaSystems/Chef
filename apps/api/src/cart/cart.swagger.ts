import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CartResponseDto,
  ErrorResponseDto,
  PersistedCartDraftResponseDto,
  ShoppingCartHistorySummaryResponseDto,
  ShoppingCartResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  cartDraftExample,
  cartExample,
  createCartDraftRequestExample,
  createCartRequestExample,
  createShoppingCartRequestExample,
  shoppingCartExample,
  shoppingCartHistoryExample,
} from '../common/http/swagger.examples';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CreateShoppingCartDto } from './dto/create-shopping-cart.dto';
import { UpdateCartDraftDto } from './dto/update-cart-draft.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

export const ApiCartController = (tag: string) =>
  applyDecorators(ApiTags(tag));

export const ApiCreateCartDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'Persist a cart draft' }),
    ApiBody({
      type: CreateCartDraftDto,
      required: true,
      description: 'Draft payload to save for later cart creation.',
      examples: {
        weeklyDraft: {
          summary: 'Persist a weekly dinner draft',
          value: createCartDraftRequestExample,
        },
      },
    }),
    ApiCreatedResponse({
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
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiUpdateCartDraft = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a persisted cart draft with partial replacement semantics',
    }),
    ApiBody({
      type: UpdateCartDraftDto,
      required: true,
    }),
    ApiOkResponse({
      description: 'Updated cart draft',
      type: PersistedCartDraftResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Cart draft not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiDeleteCartDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a persisted cart draft' }),
    ApiNoContentResponse({ description: 'Cart draft deleted' }),
    ApiNotFoundResponse({
      description: 'Cart draft not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiListCartDrafts = () =>
  applyDecorators(
    ApiOperation({ summary: 'List persisted cart drafts for the current user' }),
    ApiOkResponse({
      description: 'Persisted cart drafts',
      type: PersistedCartDraftResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiGetCartDraft = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a persisted cart draft by id' }),
    ApiOkResponse({
      description: 'Persisted cart draft',
      type: PersistedCartDraftResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Cart draft not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiCreateCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a meal-plan cart from recipe selections' }),
    ApiBody({
      type: CreateCartDto,
      required: true,
      description: 'Recipe selections to persist as a stable cart snapshot.',
      examples: {
        weeklyCart: {
          summary: 'Create a cart from recipe selections',
          value: createCartRequestExample,
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Persisted cart',
      type: CartResponseDto,
      content: {
        'application/json': {
          examples: {
            persistedCart: {
              summary: 'Persisted cart',
              value: cartExample,
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
            invalidCart: {
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

export const ApiUpdateCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a persisted cart' }),
    ApiBody({
      type: UpdateCartDto,
      required: true,
    }),
    ApiOkResponse({
      description: 'Updated cart',
      type: CartResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Selections are invalid or contain unavailable recipes',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Cart not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiDeleteCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a persisted cart' }),
    ApiNoContentResponse({ description: 'Cart deleted' }),
    ApiNotFoundResponse({
      description: 'Cart not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiListCarts = () =>
  applyDecorators(
    ApiOperation({ summary: 'List persisted carts for the current user' }),
    ApiOkResponse({
      description: 'Persisted carts',
      type: CartResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiGetCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a persisted cart by id' }),
    ApiOkResponse({
      description: 'Persisted cart',
      type: CartResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Cart not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiCreateShoppingCart = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a shopping cart from a persisted cart and retailer',
    }),
    ApiBody({
      type: CreateShoppingCartDto,
      required: true,
      description: 'Retailer context for resolving the cart into purchasable items.',
      examples: {
        walmartShoppingCart: {
          summary: 'Create a Walmart shopping cart',
          value: createShoppingCartRequestExample,
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Persisted shopping cart',
      type: ShoppingCartResponseDto,
      content: {
        'application/json': {
          examples: {
            persistedShoppingCart: {
              summary: 'Persisted shopping cart',
              value: shoppingCartExample,
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Cart not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiListShoppingCarts = () =>
  applyDecorators(
    ApiOperation({ summary: 'List persisted shopping carts for the current user' }),
    ApiOkResponse({
      description: 'Persisted shopping carts',
      type: ShoppingCartResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiListShoppingCartHistory = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List shopping cart history summaries for the current user',
    }),
    ApiOkResponse({
      description: 'Shopping cart history summaries',
      type: ShoppingCartHistorySummaryResponseDto,
      isArray: true,
      content: {
        'application/json': {
          examples: {
            historySummaries: {
              summary: 'Shopping cart history summaries',
              value: shoppingCartHistoryExample,
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

export const ApiGetShoppingCart = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a persisted shopping cart by id' }),
    ApiOkResponse({
      description: 'Persisted shopping cart',
      type: ShoppingCartResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Shopping cart not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );
