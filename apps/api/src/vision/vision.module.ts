import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';

@Module({
  imports: [AuthModule],
  controllers: [VisionController],
  providers: [VisionService, MockVisionDetectorProvider],
  exports: [VisionService],
})
export class VisionModule {}
