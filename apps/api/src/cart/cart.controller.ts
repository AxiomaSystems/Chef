import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import type { GenerateCartResponse } from '@cart/shared';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { GenerateCartDto } from './dto/generate-cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Optional dev-only actor override header.',
})
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate and persist a cart from recipe selections' })
  @ApiOkResponse({ description: 'Generated cart response' })
  generate(
    @Body() input: GenerateCartDto,
    @Headers('x-user-id') actorUserId?: string,
  ): Promise<GenerateCartResponse> {
    return this.cartService.generate(input, actorUserId);
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Persist a cart draft' })
  @ApiOkResponse({ description: 'Persisted cart draft' })
  createDraft(
    @Body() input: CreateCartDraftDto,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.createDraft(input, actorUserId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'List persisted cart drafts for the current user' })
  @ApiOkResponse({ description: 'Persisted cart drafts' })
  listDrafts(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listDrafts(actorUserId);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get a persisted cart draft by id' })
  @ApiOkResponse({ description: 'Persisted cart draft' })
  findDraft(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findDraft(id, actorUserId);
  }

  @Get('generated')
  @ApiOperation({ summary: 'List full persisted generated carts for the current user' })
  @ApiOkResponse({ description: 'Persisted generated carts' })
  listGenerated(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listGenerated(actorUserId);
  }

  @Get('generated/history')
  @ApiOperation({ summary: 'List generated cart history summaries for the current user' })
  @ApiOkResponse({ description: 'Generated cart history summaries' })
  listGeneratedHistory(@Headers('x-user-id') actorUserId?: string) {
    return this.cartService.listGeneratedHistory(actorUserId);
  }

  @Get('generated/:id')
  @ApiOperation({ summary: 'Get a persisted generated cart by id' })
  @ApiOkResponse({ description: 'Persisted generated cart' })
  findGenerated(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.cartService.findGenerated(id, actorUserId);
  }
}
