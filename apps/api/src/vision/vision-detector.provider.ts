import type {
  VisionFrameInput,
  VisionFrameResult,
  VisionScanOptions,
} from '@cart/shared';

export interface VisionDetectorProvider {
  readonly name: string;

  detectFrame(
    frame: VisionFrameInput,
    options?: VisionScanOptions,
  ): Promise<VisionFrameResult>;
}
