import { Injectable } from '@nestjs/common';
import type {
  VisionBoundingBox,
  VisionDetection,
  VisionFrameInput,
  VisionFrameResult,
  VisionScanOptions,
} from '@cart/shared';
import { randomUUID } from 'crypto';
import {
  DEFAULT_VISION_BOXES,
  type VisionOntologyEntry,
  VISION_ONTOLOGY,
} from './vision.constants';
import type { VisionDetectorProvider } from './vision-detector.provider';

@Injectable()
export class MockVisionDetectorProvider implements VisionDetectorProvider {
  readonly name = 'mock-stage1-detector';

  async detectFrame(
    frame: VisionFrameInput,
    options?: VisionScanOptions,
  ): Promise<VisionFrameResult> {
    const includeIgnored = options?.include_ignored ?? false;
    const maxDetectionsPerFrame = options?.max_detections_per_frame ?? 12;
    const rawDetections = frame.debug_objects?.length
      ? frame.debug_objects.map((entry, index) =>
          this.mapDebugObject(frame.frame_id, entry.label, index, entry.bbox, entry.confidence),
        )
      : this.inferFromFrameRef(frame.frame_id, frame.frame_ref);

    const detections = rawDetections
      .filter((detection) => includeIgnored || detection.inventory_policy !== 'ignore')
      .slice(0, maxDetectionsPerFrame);

    return {
      frame_id: frame.frame_id,
      frame_ref: frame.frame_ref,
      zone_id: frame.zone_id,
      timestamp_ms: frame.timestamp_ms,
      detections,
    };
  }

  private inferFromFrameRef(
    frameId: number,
    frameRef?: string,
  ): VisionDetection[] {
    if (!frameRef) {
      return [];
    }

    const normalizedRef = normalizeText(frameRef);
    const exactMatches = VISION_ONTOLOGY.filter(
      (entry) =>
        entry.granularity === 'exact' &&
        entry.aliases.some((alias) => containsTerm(normalizedRef, alias)),
    );

    const genericMatches =
      exactMatches.length > 0
        ? []
        : VISION_ONTOLOGY.filter(
            (entry) =>
              entry.granularity === 'generic' &&
              entry.id !== 'unknown_kitchen_item' &&
              entry.aliases.some((alias) => containsTerm(normalizedRef, alias)),
          );

    const matches = [...exactMatches, ...genericMatches];

    return matches.map((entry, index) =>
      this.createDetection(frameId, entry, index, undefined, defaultConfidenceFor(entry)),
    );
  }

  private mapDebugObject(
    frameId: number,
    label: string,
    index: number,
    bbox?: VisionBoundingBox,
    confidence?: number,
  ): VisionDetection {
    const matchedEntry = this.findOntologyEntry(label);

    return this.createDetection(
      frameId,
      matchedEntry,
      index,
      bbox,
      clampConfidence(confidence ?? defaultConfidenceFor(matchedEntry)),
    );
  }

  private createDetection(
    frameId: number,
    entry: VisionOntologyEntry,
    index: number,
    bbox?: VisionBoundingBox,
    confidence = 0.88,
  ): VisionDetection {
    return {
      observation_id: `obs_${frameId}_${index + 1}_${randomUUID().slice(0, 8)}`,
      class_id: entry.id,
      label: entry.label,
      category: entry.category,
      granularity: entry.granularity,
      inventory_policy: entry.inventory_policy,
      bbox: bbox ?? DEFAULT_VISION_BOXES[index % DEFAULT_VISION_BOXES.length],
      confidence,
    };
  }

  private findOntologyEntry(label: string): VisionOntologyEntry {
    const normalizedLabel = normalizeText(label);

    return (
      VISION_ONTOLOGY.find((entry) =>
        entry.aliases.some((alias) => containsTerm(normalizedLabel, alias)),
      ) ??
      VISION_ONTOLOGY.find((entry) => entry.id === 'unknown_kitchen_item')!
    );
  }
}

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const containsTerm = (haystack: string, needle: string): boolean => {
  const normalizedNeedle = normalizeText(needle);

  return haystack.includes(normalizedNeedle);
};

const defaultConfidenceFor = (entry: VisionOntologyEntry): number => {
  if (entry.inventory_policy === 'ignore') {
    return 0.81;
  }

  if (entry.granularity === 'generic') {
    return 0.72;
  }

  return 0.91;
};

const clampConfidence = (value: number): number =>
  Math.max(0, Math.min(1, Number(value.toFixed(2))));
