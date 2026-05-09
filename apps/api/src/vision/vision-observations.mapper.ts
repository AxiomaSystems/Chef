import type { VisionObservation } from '@cart/shared';

type VisionObservationRecord = {
  id: string;
  userId: string | null;
  inventoryItemId: string | null;
  detectedLabel: string;
  proposedName: string | null;
  canonicalSlug: string | null;
  detectorModel: string | null;
  classifierModel: string | null;
  modelName: string | null;
  confidence: number | null;
  imageRef: string | null;
  cropRef: string | null;
  bbox: unknown;
  rawPayload: unknown;
  action: VisionObservation['action'];
  createdAt: Date;
  updatedAt: Date;
};

export function mapVisionObservation(
  input: VisionObservationRecord,
): VisionObservation {
  return {
    id: input.id,
    user_id: input.userId ?? undefined,
    inventory_item_id: input.inventoryItemId ?? undefined,
    detected_label: input.detectedLabel,
    proposed_name: input.proposedName ?? undefined,
    canonical_slug: input.canonicalSlug ?? undefined,
    detector_model: input.detectorModel ?? undefined,
    classifier_model: input.classifierModel ?? undefined,
    model_name: input.modelName ?? undefined,
    confidence: input.confidence ?? undefined,
    image_ref: input.imageRef ?? undefined,
    crop_ref: input.cropRef ?? undefined,
    bbox: input.bbox ?? undefined,
    raw_payload: input.rawPayload ?? undefined,
    action: input.action,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
  };
}
