import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';

@Module({
  imports: [AuthModule, PrismaModule, IngredientsModule],
  controllers: [VisionController],
  providers: [VisionService],
  exports: [VisionService],
})
export class VisionModule {}
