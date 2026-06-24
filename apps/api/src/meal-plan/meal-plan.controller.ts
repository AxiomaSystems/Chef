import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestActorGuard } from '../auth/request-actor.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiCreateMealEvent,
  ApiCreateMealPlanCart,
  ApiDeleteMealEvent,
  ApiGetMealEvents,
  ApiGetMealPlan,
  ApiMealPlanController,
  ApiUpdateMealEvent,
  ApiUpsertMealPlan,
} from './meal-plan.swagger';
import { CreateMealPlanCartDto } from './dto/create-meal-plan-cart.dto';
import { CreateMealEventDto, UpdateMealEventDto } from './dto/meal-event.dto';
import { MealPlanRangeQueryDto } from './dto/meal-plan-range-query.dto';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';
import { MealPlanService } from './meal-plan.service';

@Controller('api/v1')
@UseGuards(RequestActorGuard)
@ApiMealPlanController()
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get('meal-plans')
  @ApiGetMealPlan()
  getMealPlan(
    @Query() query: MealPlanRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (query.week_start && !query.from && !query.to) {
      return this.mealPlanService.getWeekPlan(query.week_start, user.sub);
    }

    return this.mealPlanService.getRangePlan(query, user.sub);
  }

  @Put('meal-plans')
  @ApiUpsertMealPlan()
  upsertMealPlan(
    @Query('week_start') weekStart: string,
    @Body() input: UpsertMealPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.upsertWeekPlan(weekStart, input, user.sub);
  }

  @Post('meal-plans/cart')
  @HttpCode(201)
  @ApiCreateMealPlanCart()
  createMealPlanCart(
    @Body() input: CreateMealPlanCartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.createCartFromPlan(input, user.sub);
  }

  @Get('meal-events')
  @ApiGetMealEvents()
  listMealEvents(
    @Query() query: MealPlanRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.listEvents(query, user.sub);
  }

  @Post('meal-events')
  @HttpCode(201)
  @ApiCreateMealEvent()
  createMealEvent(
    @Body() input: CreateMealEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.createEvent(input, user.sub);
  }

  @Patch('meal-events/:id')
  @ApiUpdateMealEvent()
  updateMealEvent(
    @Param('id') id: string,
    @Body() input: UpdateMealEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.updateEvent(id, input, user.sub);
  }

  @Delete('meal-events/:id')
  @HttpCode(204)
  @ApiDeleteMealEvent()
  async deleteMealEvent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.mealPlanService.deleteEvent(id, user.sub);
  }
}
