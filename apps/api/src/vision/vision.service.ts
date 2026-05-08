import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  VisionDetection,
  VisionPipelineConfig,
  VisionScanRequest,
  VisionScanResponse,
} from '@cart/shared';
import type { AnalyzeVisionMediaDto } from './dto/analyze-vision-media.dto';
import { buildVisionPipelineConfig } from './vision.constants';
import { MockVisionDetectorProvider } from './mock-vision-detector.provider';

const DEFAULT_MEDIA_DETECTOR = 'yolo';
const DEFAULT_CLASSIFIER_RUN = 'resnet18_ingredient_crops_5000_modal_frozen_v2';

export type UploadedVisionMedia = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

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
        detected_labels: detectedLabels,
      },
    };
  }

  async analyzeMedia(
    file: UploadedVisionMedia | undefined,
    input: AnalyzeVisionMediaDto,
  ): Promise<VisionScanResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Media upload is required');
    }

    const sidecarBaseUrl =
      process.env.VISION_API_BASE_URL ?? 'http://localhost:8000';
    const formData = new FormData();
    const mediaBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });

    formData.set('media', mediaBlob, file.originalname || 'vision-upload');
    formData.set('media_kind', input.media_kind ?? 'photo');
    formData.set(
      'detector',
      input.detector ?? process.env.VISION_DETECTOR ?? DEFAULT_MEDIA_DETECTOR,
    );
    const modelName = input.model_name ?? process.env.VISION_YOLO_MODEL;
    if (modelName) {
      formData.set('model_name', modelName);
    }
    formData.set(
      'classify_crops',
      String(
        input.classify_crops ?? process.env.VISION_CLASSIFY_CROPS ?? false,
      ),
    );
    formData.set(
      'classifier_run',
      input.classifier_run ??
        process.env.VISION_CLASSIFIER_RUN ??
        DEFAULT_CLASSIFIER_RUN,
    );
    if (
      input.classifier_checkpoint ??
      process.env.VISION_CLASSIFIER_CHECKPOINT
    ) {
      formData.set(
        'classifier_checkpoint',
        input.classifier_checkpoint ??
          process.env.VISION_CLASSIFIER_CHECKPOINT ??
          '',
      );
    }
    formData.set(
      'classifier_top_k',
      String(
        input.classifier_top_k ?? process.env.VISION_CLASSIFIER_TOP_K ?? 5,
      ),
    );
    formData.set(
      'classifier_min_confidence',
      String(
        input.classifier_min_confidence ??
          process.env.VISION_CLASSIFIER_MIN_CONFIDENCE ??
          0.15,
      ),
    );
    formData.set(
      'use_full_image_fallback',
      String(
        input.use_full_image_fallback ??
          process.env.VISION_USE_FULL_IMAGE_FALLBACK ??
          true,
      ),
    );
    formData.set(
      'full_image_min_confidence',
      String(
        input.full_image_min_confidence ??
          process.env.VISION_FULL_IMAGE_MIN_CONFIDENCE ??
          0.15,
      ),
    );
    formData.set(
      'use_grid_fallback',
      String(
        input.use_grid_fallback ??
          process.env.VISION_USE_GRID_FALLBACK ??
          false,
      ),
    );
    formData.set(
      'grid_max_crops',
      String(input.grid_max_crops ?? process.env.VISION_GRID_MAX_CROPS ?? 24),
    );
    formData.set(
      'grid_crop_fraction',
      String(
        input.grid_crop_fraction ??
          process.env.VISION_GRID_CROP_FRACTION ??
          0.35,
      ),
    );
    formData.set(
      'grid_stride_fraction',
      String(
        input.grid_stride_fraction ??
          process.env.VISION_GRID_STRIDE_FRACTION ??
          0.5,
      ),
    );
    formData.set(
      'grid_min_confidence',
      String(
        input.grid_min_confidence ??
          process.env.VISION_GRID_MIN_CONFIDENCE ??
          0.25,
      ),
    );
    formData.set(
      'grid_max_additions',
      String(
        input.grid_max_additions ?? process.env.VISION_GRID_MAX_ADDITIONS ?? 8,
      ),
    );
    formData.set('include_ignored', String(input.include_ignored ?? false));
    formData.set(
      'max_detections_per_frame',
      String(input.max_detections_per_frame ?? 12),
    );
    formData.set(
      'confidence_threshold',
      String(input.confidence_threshold ?? 0.25),
    );
    formData.set('sampled_fps', String(input.sampled_fps ?? 1));
    formData.set('max_frames', String(input.max_frames ?? 12));

    let response: Response;

    try {
      response = await fetch(
        `${sidecarBaseUrl.replace(/\/$/, '')}/detect/media`,
        {
          method: 'POST',
          body: formData,
        },
      );
    } catch (error) {
      throw new BadGatewayException(
        `Vision sidecar is unavailable at ${sidecarBaseUrl}. Start apps/vision-lab/fastapi_app.py before running real YOLO scans.`,
        { cause: error },
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Vision sidecar failed with ${response.status}${detail ? `: ${detail}` : ''}`,
      );
    }

    return normalizeVisionScanResponse(
      (await response.json()) as VisionScanResponse,
    );
  }
}

type DetectionWithPredictionAliases = VisionDetection & {
  classificationPredictions?: VisionDetection['classification_predictions'];
  predictions?: VisionDetection['classification_predictions'];
  top_predictions?: VisionDetection['classification_predictions'];
};

function normalizeVisionScanResponse(
  payload: VisionScanResponse,
): VisionScanResponse {
  for (const frame of payload.frames ?? []) {
    for (const detection of frame.detections ?? []) {
      const detectionWithAliases = detection as DetectionWithPredictionAliases;
      const predictionCandidates = [
        detection.classification_predictions,
        detectionWithAliases.classificationPredictions,
        detectionWithAliases.predictions,
        detectionWithAliases.top_predictions,
      ];

      detection.classification_predictions =
        predictionCandidates.find((predictions) => predictions?.length) ?? [];
    }
  }

  return payload;
}
