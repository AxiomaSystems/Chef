import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AggregationModule } from './aggregation/aggregation.module';
import { CartModule } from './cart/cart.module';
import { CommonHttpModule } from './common/http/common-http.module';
import { MatchingModule } from './matching/matching.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipeModule } from './recipe/recipe.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    CommonHttpModule,
    PrismaModule,
    UserModule,
    RecipeModule,
    AggregationModule,
    MatchingModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
