import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  VisionObservation,
  VisionDetection,
  VisionPipelineConfig,
  VisionScanRequest,
  VisionScanResponse,
} from '@cart/shared';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import type { AnalyzeVisionMediaDto } from './dto/analyze-vision-media.dto';
import type { AddVisionObservationToInventoryDto } from './dto/add-vision-observation-to-inventory.dto';
import type { CreateVisionObservationDto } from './dto/create-vision-observation.dto';
import { buildVisionPipelineConfig } from './vision.constants';
import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
import { mapVisionObservation } from './vision-observations.mapper';

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
    private readonly prisma: PrismaService,
    private readonly ingredientsService: IngredientsService,
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
      'classifier_relabel_enabled',
      String(
        input.classifier_relabel_enabled ??
          process.env.VISION_CLASSIFIER_RELABEL_ENABLED ??
          false,
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
    formData.set(
      'ocr_enabled',
      String(input.ocr_enabled ?? process.env.VISION_OCR_ENABLED ?? false),
    );
    formData.set(
      'ocr_provider',
      input.ocr_provider ?? process.env.VISION_OCR_PROVIDER ?? 'rapidocr',
    );
    formData.set(
      'ocr_mode',
      input.ocr_mode ?? process.env.VISION_OCR_MODE ?? 'intelligent_filtering',
    );
    formData.set(
      'ocr_cache_enabled',
      String(
        input.ocr_cache_enabled ?? process.env.VISION_OCR_CACHE_ENABLED ?? true,
      ),
    );
    formData.set(
      'ocr_container_only',
      String(
        input.ocr_container_only ??
          process.env.VISION_OCR_CONTAINER_ONLY ??
          true,
      ),
    );
    formData.set(
      'ocr_min_confidence',
      String(
        input.ocr_min_confidence ??
          process.env.VISION_OCR_MIN_CONFIDENCE ??
          0.35,
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

  async createObservation(
    userId: string,
    input: CreateVisionObservationDto,
  ): Promise<VisionObservation> {
    const detectedLabel = input.detected_label.trim();

    if (!detectedLabel) {
      throw new BadRequestException('detected_label is required');
    }

    const observation = await this.prisma.visionObservation.create({
      data: {
        userId,
        detectedLabel,
        proposedName: input.proposed_name?.trim() || undefined,
        canonicalSlug: input.canonical_slug?.trim() || undefined,
        detectorModel: input.detector_model?.trim() || undefined,
        classifierModel: input.classifier_model?.trim() || undefined,
        modelName: input.model_name?.trim() || undefined,
        confidence: input.confidence ?? undefined,
        imageRef: input.image_ref?.trim() || undefined,
        cropRef: input.crop_ref?.trim() || undefined,
        bbox: input.bbox as Prisma.InputJsonValue | undefined,
        rawPayload: input.raw_payload as Prisma.InputJsonValue | undefined,
      },
    });

    return mapVisionObservation(observation);
  }

  async listObservations(userId: string): Promise<VisionObservation[]> {
    const observations = await this.prisma.visionObservation.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return observations.map(mapVisionObservation);
  }

  async addObservationToInventory(
    userId: string,
    id: string,
    input: AddVisionObservationToInventoryDto,
  ): Promise<VisionObservation> {
    const observation = await this.findUserObservationOrThrow(userId, id);

    if (observation.inventoryItemId) {
      throw new BadRequestException('Observation already created inventory');
    }

    if (observation.action === 'discarded') {
      throw new BadRequestException('Discarded observation cannot be added');
    }

    const ingredient = await this.resolveInventoryIngredient(
      input,
      observation,
    );
    const displayName =
      input.display_name?.trim() ||
      observation.proposedName?.trim() ||
      ingredient?.canonicalName ||
      observation.detectedLabel;

    if (!displayName.trim()) {
      throw new BadRequestException('Inventory item name is required');
    }

    const inventoryItem = await this.prisma.kitchenInventoryItem.create({
      data: {
        userId,
        ingredientId: ingredient?.id,
        displayName,
        normalizedName: this.ingredientsService.normalizeName(displayName),
        label: displayName,
        estimatedAmount: input.estimated_amount ?? undefined,
        unit: input.unit?.trim() || undefined,
        source: 'vision',
        confidence: this.inventoryConfidenceFor(observation.confidence),
        reviewStatus: 'active',
      },
    });

    const updated = await this.prisma.visionObservation.update({
      where: { id: observation.id },
      data: {
        inventoryItemId: inventoryItem.id,
        proposedName: displayName,
        canonicalSlug: ingredient?.slug ?? observation.canonicalSlug,
        action: ingredient ? 'resolved_to_ingredient' : 'added_to_inventory',
      },
    });

    return mapVisionObservation(updated);
  }

  async discardObservation(
    userId: string,
    id: string,
  ): Promise<VisionObservation> {
    const observation = await this.findUserObservationOrThrow(userId, id);

    if (observation.inventoryItemId) {
      throw new BadRequestException(
        'Observation already created inventory and cannot be discarded',
      );
    }

    const updated = await this.prisma.visionObservation.update({
      where: { id: observation.id },
      data: { action: 'discarded' },
    });

    return mapVisionObservation(updated);
  }

  private async findUserObservationOrThrow(userId: string, id: string) {
    const observation = await this.prisma.visionObservation.findFirst({
      where: { id, userId },
    });

    if (!observation) {
      throw new NotFoundException(`Vision observation ${id} not found`);
    }

    return observation;
  }

  private async resolveInventoryIngredient(
    input: AddVisionObservationToInventoryDto,
    observation: Awaited<
      ReturnType<VisionService['findUserObservationOrThrow']>
    >,
  ) {
    if (input.ingredient_id) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: input.ingredient_id },
      });

      if (!ingredient) {
        throw new NotFoundException('Ingredient not found');
      }

      return ingredient;
    }

    const slug = input.canonical_slug?.trim() || observation.canonicalSlug;
    if (slug) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { slug },
      });

      if (ingredient) {
        return ingredient;
      }
    }

    if (input.canonical_name) {
      return this.ingredientsService.ensureIngredient(input.canonical_name);
    }

    return null;
  }

  private inventoryConfidenceFor(confidence: number | null) {
    if (confidence === null || confidence === undefined) {
      return 'medium';
    }

    if (confidence >= 0.75) {
      return 'high';
    }

    if (confidence < 0.4) {
      return 'low';
    }

    return 'medium';
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
