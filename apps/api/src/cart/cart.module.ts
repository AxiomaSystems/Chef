import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { AuthModule } from '../auth/auth.module';
import { CartExportModule } from '../cart-export/cart-export.module';
import { MatchingModule } from '../matching/matching.module';
import { RecipeModule } from '../recipe/recipe.module';
import { UserModule } from '../user/user.module';
import { CartController } from './cart.controller';
import { CartPersistenceService } from './cart.persistence';
import { CartPersistenceRepository } from './persistence/cart.persistence.repository';
import { CartService } from './cart.service';

@Module({
  imports: [
    AuthModule,
    RecipeModule,
    AggregationModule,
    MatchingModule,
    CartExportModule,
    UserModule,
  ],
  controllers: [CartController],
  providers: [CartService, CartPersistenceService, CartPersistenceRepository],
})
export class CartModule {}
