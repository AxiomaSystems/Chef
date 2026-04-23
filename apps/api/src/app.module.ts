import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AggregationModule } from './aggregation/aggregation.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CommonHttpModule } from './common/http/common-http.module';
import { CuisinesModule } from './cuisines/cuisines.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { MatchingModule } from './matching/matching.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipeModule } from './recipe/recipe.module';
import { RetailersModule } from './retailers/retailers.module';
import { TagsModule } from './tags/tags.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    CommonHttpModule,
    PrismaModule,
    AuthModule,
    UserModule,
    CuisinesModule,
    TagsModule,
    IngredientsModule,
    RecipeModule,
    MealPlanModule,
    AggregationModule,
    MatchingModule,
    RetailersModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
