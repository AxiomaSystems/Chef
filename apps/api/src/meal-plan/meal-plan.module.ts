import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { RecipeModule } from '../recipe/recipe.module';
import { UserModule } from '../user/user.module';
import {
  MealEventController,
  MealPlanController,
} from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';

@Module({
  imports: [AuthModule, CartModule, RecipeModule, UserModule],
  controllers: [MealPlanController, MealEventController],
  providers: [MealPlanService],
})
export class MealPlanModule {}
