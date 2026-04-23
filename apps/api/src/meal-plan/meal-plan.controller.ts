import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestActorGuard } from '../auth/request-actor.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiGetMealPlan,
  ApiMealPlanController,
  ApiUpsertMealPlan,
} from './meal-plan.swagger';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mealPlanService.getWeekPlan(weekStart, user.sub);
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
