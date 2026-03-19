import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RecipeController } from './recipe.controller';
import { RecipeForkController } from './recipe-fork.controller';
import { RecipeRepository } from './recipe.repository';
import { RecipeService } from './recipe.service';

@Module({
  imports: [UserModule],
  controllers: [RecipeController, RecipeForkController],
  providers: [RecipeService, RecipeRepository],
  exports: [RecipeService],
})
export class RecipeModule {}
