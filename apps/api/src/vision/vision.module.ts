import { Module } from '@nestjs/common';
import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';

@Module({
  controllers: [VisionController],
  providers: [VisionService, MockVisionDetectorProvider],
  exports: [VisionService],
})
export class VisionModule {}
