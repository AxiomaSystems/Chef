import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { RecipeModule } from '../recipe/recipe.module';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';

@Module({
  imports: [AuthModule, AiModule, RecipeModule],
  controllers: [CaptureController],
  providers: [CaptureService],
  exports: [CaptureService],
})
export class CaptureModule {}
