import type {
  VisionBoundingBox,
  VisionClassCategory,
  VisionClassDefinition,
  VisionInventoryPolicy,
  VisionLabelGranularity,
  VisionPipelineConfig,
} from '@cart/shared';

export type VisionOntologyEntry = VisionClassDefinition & {
  aliases: string[];
};

export const VISION_ONTOLOGY: VisionOntologyEntry[] = [
  track('onion', 'onion', 'produce', ['onion', 'yellow onion', 'red onion']),
  track('banana', 'banana', 'produce', ['banana', 'bananas']),
  track('egg_carton', 'egg carton', 'packaged_food', ['egg carton', 'eggs']),
  track('milk_carton', 'milk carton', 'packaged_food', ['milk carton', 'milk']),
  track('olive_oil_bottle', 'olive oil bottle', 'container', [
    'olive oil bottle',
    'olive oil',
    'oil bottle',
  ]),
  review('bottle', 'bottle', 'container', ['bottle']),
  review('jar', 'jar', 'container', ['jar']),
  review('container', 'container', 'container', ['container']),
  review('leftovers_container', 'leftovers container', 'prepared_food', [
    'leftovers',
    'leftovers container',
  ]),
  ignore('plate', 'plate', 'kitchenware', ['plate']),
  ignore('mug', 'mug', 'kitchenware', ['mug']),
  ignore('utensil', 'utensil', 'kitchenware', ['utensil', 'fork', 'spoon']),
  review('unknown_kitchen_item', 'unknown kitchen item', 'unknown', ['unknown']),
];

export const DEFAULT_VISION_BOXES: VisionBoundingBox[] = [
  { x: 0.14, y: 0.18, width: 0.22, height: 0.38 },
  { x: 0.42, y: 0.2, width: 0.2, height: 0.34 },
  { x: 0.66, y: 0.24, width: 0.18, height: 0.28 },
  { x: 0.22, y: 0.58, width: 0.26, height: 0.24 },
  { x: 0.56, y: 0.56, width: 0.24, height: 0.3 },
];

export function buildVisionPipelineConfig(provider: string): VisionPipelineConfig {
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
    ).map(({ aliases: _aliases, ...entry }) => entry),
    notes: [
      'Stage 1 is closed-set detection only.',
      'Tracking, embeddings, OCR, and open-vocabulary fallback are intentionally outside this API contract.',
      'Use inventory_policy to route detections into track, review, or ignore workflows.',
    ],
  };
}

function track(
  id: string,
  label: string,
  category: VisionClassCategory,
  aliases: string[],
): VisionOntologyEntry {
  return entry(id, label, category, 'exact', 'track', aliases);
}

function review(
  id: string,
  label: string,
  category: VisionClassCategory,
  aliases: string[],
): VisionOntologyEntry {
  return entry(id, label, category, 'generic', 'review', aliases);
}

function ignore(
  id: string,
  label: string,
  category: VisionClassCategory,
  aliases: string[],
): VisionOntologyEntry {
  return entry(id, label, category, 'generic', 'ignore', aliases);
}

function entry(
  id: string,
  label: string,
  category: VisionClassCategory,
  granularity: VisionLabelGranularity,
  inventoryPolicy: VisionInventoryPolicy,
  aliases: string[],
): VisionOntologyEntry {
  return {
    id,
    label,
    category,
    granularity,
    inventory_policy: inventoryPolicy,
    stage_1_enabled: true,
    aliases,
  };
}
