import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AggregationModule } from './aggregation/aggregation.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CommonHttpModule } from './common/http/common-http.module';
import { CuisinesModule } from './cuisines/cuisines.module';
import { MatchingModule } from './matching/matching.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipeModule } from './recipe/recipe.module';
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
    RecipeModule,
    AggregationModule,
    MatchingModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
