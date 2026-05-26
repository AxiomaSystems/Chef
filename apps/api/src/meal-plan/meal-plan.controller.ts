import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiGetMealPlan,
  ApiMealPlanController,
  ApiUpsertMealPlan,
} from './meal-plan.swagger';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';
import {
  CreateMealEventDto,
  GenerateMealPlanCartDto,
  UpdateMealEventDto,
} from './dto/meal-event.dto';
import { MealPlanService } from './meal-plan.service';

@Controller('api/v1/meal-plans')
@UseGuards(RequestActorGuard)
@ApiMealPlanController()
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get()
  @ApiGetMealPlan()
  getMealPlan(
    @Query('week_start') weekStart: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (from && to) {
      return this.mealPlanService.getRangePlan(from, to, user.sub);
    }

    return this.mealPlanService.getWeekPlan(weekStart, user.sub);
  }

  @Post('cart')
  generateCart(
    @Body() input: GenerateMealPlanCartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.generateCart(input, user.sub);
  }

  @Put()
  @ApiUpsertMealPlan()
  upsertMealPlan(
    @Query('week_start') weekStart: string,
    @Body() input: UpsertMealPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.upsertWeekPlan(weekStart, input, user.sub);
  }
}

@Controller('api/v1/meal-events')
@UseGuards(RequestActorGuard)
export class MealEventController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Post()
  createEvent(
    @Body() input: CreateMealEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.createEvent(input, user.sub);
  }

  @Patch(':id')
  updateEvent(
    @Param('id') id: string,
    @Body() input: UpdateMealEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.updateEvent(id, input, user.sub);
  }

  @Delete(':id')
  deleteEvent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mealPlanService.deleteEvent(id, user.sub);
  }
}
