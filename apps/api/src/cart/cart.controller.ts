import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import type { GenerateCartResponse } from '@cart/shared';
import {
  ApiCartController,
  ApiCreateCartDraft,
  ApiGenerateCart,
  ApiGetCartDraft,
  ApiGetGeneratedCart,
  ApiListCartDrafts,
  ApiListGeneratedCartHistory,
  ApiListGeneratedCarts,
} from './cart.swagger';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { GenerateCartDto } from './dto/generate-cart.dto';
import { CartService } from './cart.service';

@ApiCartController()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('generate')
  @ApiGenerateCart()
  generate(
    @Body() input: GenerateCartDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<GenerateCartResponse> {
    return this.cartService.generate(input, actorUserId);
  }

  @Post('drafts')
  @ApiCreateCartDraft()
  createDraft(
    @Body() input: CreateCartDraftDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.createDraft(input, actorUserId);
  }

  @Get('drafts')
  @ApiListCartDrafts()
  listDrafts(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listDrafts(actorUserId);
  }

  @Get('drafts/:id')
  @ApiGetCartDraft()
  findDraft(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findDraft(id, actorUserId);
  }

  @Get('generated')
  @ApiListGeneratedCarts()
  listGenerated(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listGenerated(actorUserId);
  }

  @Get('generated/history')
  @ApiListGeneratedCartHistory()
  listGeneratedHistory(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listGeneratedHistory(actorUserId);
  }

  @Get('generated/:id')
  @ApiGetGeneratedCart()
  findGenerated(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findGenerated(id, actorUserId);
  }
}
