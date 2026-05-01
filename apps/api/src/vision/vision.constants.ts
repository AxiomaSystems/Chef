import type {
  VisionBoundingBox,
  VisionClassDefinition,
  VisionPipelineConfig,
} from '@cart/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type VisionOntologyEntry = VisionClassDefinition & {
  aliases: string[];
};

type VisionMappingFile = {
  classes: VisionOntologyEntry[];
  default_boxes: VisionBoundingBox[];
  pipeline_notes: string[];
};

const VISION_MAPPINGS = loadVisionMappings();

export const VISION_ONTOLOGY: VisionOntologyEntry[] = VISION_MAPPINGS.classes;

export const DEFAULT_VISION_BOXES: VisionBoundingBox[] =
  VISION_MAPPINGS.default_boxes;

export function buildVisionPipelineConfig(
  provider: string,
): VisionPipelineConfig {
  return {
    provider,
    stage: 'detection_only',
    tracking_enabled: false,
    embeddings_enabled: false,
    open_vocabulary_enabled: false,
    packaged_food_enrichment_enabled: false,
    segmentation_enabled: false,
    supported_classes: VISION_ONTOLOGY.filter(
      (entry) => entry.stage_1_enabled,
    ).map(toClassDefinition),
    notes: VISION_MAPPINGS.pipeline_notes,
  };
}

function toClassDefinition(entry: VisionOntologyEntry): VisionClassDefinition {
  return {
    id: entry.id,
    label: entry.label,
    category: entry.category,
    granularity: entry.granularity,
    inventory_policy: entry.inventory_policy,
    stage_1_enabled: entry.stage_1_enabled,
  };
}

function loadVisionMappings(): VisionMappingFile {
  const candidates = [
    resolve(process.cwd(), 'packages/shared/vision-label-mappings.json'),
    resolve(process.cwd(), '../../packages/shared/vision-label-mappings.json'),
    resolve(
      __dirname,
      '../../../../packages/shared/vision-label-mappings.json',
    ),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as VisionMappingFile;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Missing packages/shared/vision-label-mappings.json for vision ontology.',
  );
}
