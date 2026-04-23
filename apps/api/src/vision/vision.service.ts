import { Injectable } from '@nestjs/common';
import type { VisionPipelineConfig, VisionScanRequest, VisionScanResponse } from '@cart/shared';
import { buildVisionPipelineConfig } from './vision.constants';
import { MockVisionDetectorProvider } from './mock-vision-detector.provider';

@Injectable()
export class VisionService {
  constructor(
    private readonly mockVisionDetectorProvider: MockVisionDetectorProvider,
  ) {}

  describePipeline(): VisionPipelineConfig {
    return buildVisionPipelineConfig(this.mockVisionDetectorProvider.name);
  }

  async analyzeScan(input: VisionScanRequest): Promise<VisionScanResponse> {
    const frames = await Promise.all(
      input.frames.map((frame) =>
        this.mockVisionDetectorProvider.detectFrame(frame, input.options),
      ),
    );
    const detections = frames.flatMap((frame) => frame.detections);
    const detectedLabels = Array.from(
      new Set(detections.map((detection) => detection.label)),
    ).sort((left, right) => left.localeCompare(right));

    return {
      scan_session_id: input.scan_session_id,
      pipeline: this.describePipeline(),
      frames,
      summary: {
        frame_count: frames.length,
        detection_count: detections.length,
        track_candidate_count: detections.filter(
          (detection) => detection.inventory_policy === 'track',
        ).length,
        review_candidate_count: detections.filter(
          (detection) => detection.inventory_policy === 'review',
        ).length,
        ignored_detection_count: detections.filter(
          (detection) => detection.inventory_policy === 'ignore',
        ).length,
        detected_labels,
      },
    };
  }
}
