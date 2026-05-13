export type VisionInventoryPolicy = "track" | "review" | "ignore";

export type VisionLabelGranularity = "exact" | "generic";

export type VisionClassCategory =
  | "produce"
  | "container"
  | "packaged_food"
  | "prepared_food"
  | "kitchenware"
  | "unknown";

export type VisionBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisionClassDefinition = {
  id: string;
  label: string;
  category: VisionClassCategory;
  granularity: VisionLabelGranularity;
  inventory_policy: VisionInventoryPolicy;
  stage_1_enabled: boolean;
};

export type VisionPipelineStage = "detection_only";

export type VisionPipelineConfig = {
  provider: string;
  stage: VisionPipelineStage;
  tracking_enabled: boolean;
  embeddings_enabled: boolean;
  open_vocabulary_enabled: boolean;
  packaged_food_enrichment_enabled: boolean;
  segmentation_enabled: boolean;
  supported_classes: VisionClassDefinition[];
  notes: string[];
};

export type VisionDebugObjectInput = {
  label: string;
  bbox?: VisionBoundingBox;
  confidence?: number;
};

export type VisionFrameInput = {
  frame_id: number;
  frame_ref?: string;
  zone_id?: string;
  timestamp_ms?: number;
  debug_objects?: VisionDebugObjectInput[];
};

export type VisionScanOptions = {
  include_ignored?: boolean;
  max_detections_per_frame?: number;
};

export type VisionDetection = {
  observation_id: string;
  class_id: string;
  label: string;
  category: VisionClassCategory;
  granularity: VisionLabelGranularity;
  inventory_policy: VisionInventoryPolicy;
  bbox: VisionBoundingBox;
  confidence: number;
  detector_label?: string;
  detector_confidence?: number;
  classification_predictions?: {
    label: string;
    probability: number;
  }[];
  thumbnail_data_url?: string;
};

export type VisionFrameResult = {
  frame_id: number;
  frame_ref?: string;
  zone_id?: string;
  timestamp_ms?: number;
  frame_image_data_url?: string;
  annotated_image_data_url?: string;
  detections: VisionDetection[];
};

export type VisionScanRequest = {
  scan_session_id: string;
  frames: VisionFrameInput[];
  options?: VisionScanOptions;
};

export type VisionScanSummary = {
  frame_count: number;
  detection_count: number;
  track_candidate_count: number;
  review_candidate_count: number;
  ignored_detection_count: number;
  detected_labels: string[];
};

export type VisionScanResponse = {
  scan_session_id: string;
  pipeline: VisionPipelineConfig;
  frames: VisionFrameResult[];
  summary: VisionScanSummary;
  classification?: {
    enabled: boolean;
    checkpoint?: string;
    top_k?: number;
    min_confidence?: number;
    classified_detection_count?: number;
    full_image_fallback_enabled?: boolean;
    full_image_added_count?: number;
    grid_fallback_enabled?: boolean;
    grid_added_count?: number;
    reason?: string;
  };
};

export type VisionObservationAction =
  | "pending"
  | "added_to_inventory"
  | "renamed"
  | "discarded"
  | "resolved_to_ingredient";

export type VisionObservation = {
  id: string;
  user_id?: string;
  inventory_item_id?: string;
  detected_label: string;
  proposed_name?: string;
  canonical_slug?: string;
  detector_model?: string;
  classifier_model?: string;
  model_name?: string;
  confidence?: number;
  image_ref?: string;
  crop_ref?: string;
  bbox?: unknown;
  raw_payload?: unknown;
  action: VisionObservationAction;
  created_at: string;
  updated_at: string;
};

export type CreateVisionObservationRequest = {
  detected_label: string;
  proposed_name?: string;
  canonical_slug?: string;
  detector_model?: string;
  classifier_model?: string;
  model_name?: string;
  confidence?: number;
  image_ref?: string;
  crop_ref?: string;
  bbox?: unknown;
  raw_payload?: unknown;
};

export type AddVisionObservationToInventoryRequest = {
  display_name?: string;
  ingredient_id?: string;
  canonical_slug?: string;
  canonical_name?: string;
  estimated_amount?: number;
  unit?: string;
};
