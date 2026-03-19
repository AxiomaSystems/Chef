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
import {
  ApiCartController,
  ApiCreateCart,
  ApiCreateCartDraft,
  ApiCreateShoppingCart,
  ApiDeleteCart,
  ApiDeleteCartDraft,
  ApiGetCart,
  ApiGetCartDraft,
  ApiGetShoppingCart,
  ApiListCartDrafts,
  ApiListCarts,
  ApiListShoppingCartHistory,
  ApiListShoppingCarts,
  ApiUpdateCart,
  ApiUpdateCartDraft,
} from './cart.swagger';
import { CartService } from './cart.service';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CreateShoppingCartDto } from './dto/create-shopping-cart.dto';
import { UpdateCartDraftDto } from './dto/update-cart-draft.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('api/v1')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('cart-drafts')
  @ApiCartController('cart-drafts')
  @ApiCreateCartDraft()
  createDraft(
    @Body() input: CreateCartDraftDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.createDraft(input, actorUserId);
  }

  @Patch('cart-drafts/:id')
  @ApiCartController('cart-drafts')
  @ApiUpdateCartDraft()
  updateDraft(
    @Param('id') id: string,
    @Body() input: UpdateCartDraftDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.updateDraft(id, input, actorUserId);
  }

  @Delete('cart-drafts/:id')
  @HttpCode(204)
  @ApiCartController('cart-drafts')
  @ApiDeleteCartDraft()
  async removeDraft(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    await this.cartService.removeDraft(id, actorUserId);
  }

  @Get('cart-drafts')
  @ApiCartController('cart-drafts')
  @ApiListCartDrafts()
  listDrafts(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listDrafts(actorUserId);
  }

  @Get('cart-drafts/:id')
  @ApiCartController('cart-drafts')
  @ApiGetCartDraft()
  findDraft(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findDraft(id, actorUserId);
  }

  @Post('carts')
  @ApiCartController('carts')
  @ApiCreateCart()
  createCart(
    @Body() input: CreateCartDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.createCart(input, actorUserId);
  }

  @Patch('carts/:id')
  @ApiCartController('carts')
  @ApiUpdateCart()
  updateCart(
    @Param('id') id: string,
    @Body() input: UpdateCartDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.updateCart(id, input, actorUserId);
  }

  @Delete('carts/:id')
  @HttpCode(204)
  @ApiCartController('carts')
  @ApiDeleteCart()
  async removeCart(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    await this.cartService.removeCart(id, actorUserId);
  }

  @Get('carts')
  @ApiCartController('carts')
  @ApiListCarts()
  listCarts(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listCarts(actorUserId);
  }

  @Get('carts/:id')
  @ApiCartController('carts')
  @ApiGetCart()
  findCart(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findCart(id, actorUserId);
  }

  @Post('carts/:cartId/shopping-carts')
  @ApiCartController('shopping-carts')
  @ApiCreateShoppingCart()
  createShoppingCart(
    @Param('cartId') cartId: string,
    @Body() input: CreateShoppingCartDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.createShoppingCart(cartId, input, actorUserId);
  }

  @Get('shopping-carts/history')
  @ApiCartController('shopping-carts')
  @ApiListShoppingCartHistory()
  listShoppingCartHistory(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listShoppingCartHistory(actorUserId);
  }

  @Get('shopping-carts')
  @ApiCartController('shopping-carts')
  @ApiListShoppingCarts()
  listShoppingCarts(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listShoppingCarts(actorUserId);
  }

  @Get('shopping-carts/:id')
  @ApiCartController('shopping-carts')
  @ApiGetShoppingCart()
  findShoppingCart(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findShoppingCart(id, actorUserId);
  }
}
