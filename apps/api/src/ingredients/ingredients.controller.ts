import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Ingredient, KitchenInventoryItem } from '@cart/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalRequestActorGuard } from '../auth/request-actor.guard';
import { AddKitchenInventoryItemDto } from './dto/add-kitchen-inventory-item.dto';
import { IngredientsService } from './ingredients.service';

@Controller('api/v1')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get('ingredients')
  @UseGuards(OptionalRequestActorGuard)
  listIngredients(@Query('q') query?: string): Promise<Ingredient[]> {
    return this.ingredientsService.listIngredients(query);
  }

  @Get('me/kitchen-inventory')
  @UseGuards(JwtAuthGuard)
  listKitchenInventory(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KitchenInventoryItem[]> {
    return this.ingredientsService.listInventory(user.sub);
  }

  @Post('me/kitchen-inventory')
  @UseGuards(JwtAuthGuard)
  addKitchenInventoryItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AddKitchenInventoryItemDto,
  ): Promise<KitchenInventoryItem> {
    return this.ingredientsService.addInventoryItem(user.sub, input);
  }

  @Delete('me/kitchen-inventory/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async removeKitchenInventoryItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.ingredientsService.removeInventoryItem(user.sub, id);
  }
}
