export type AiRateLimitScope = "user" | "ip";

export type AiUsageCategory =
  | "chat"
  | "autofill"
  | "imports"
  | "inventory_fill";

export type AiUsageCategorySnapshot = {
  category: AiUsageCategory;
  label: string;
  used: number;
};

export type AiRateLimitSnapshot = {
  scope: AiRateLimitScope;
  window_ms: number;
  max_requests: number;
  used: number;
  remaining: number;
  reset_at: string | null;
  reset_in_seconds: number | null;
};

export type AiLimitsStatus = {
  provider: string;
  model: string | null;
  openai_configured: boolean;
  rate_limit: AiRateLimitSnapshot;
  usage_categories: AiUsageCategorySnapshot[];
};

export type AiInventoryStructureInputItem = {
  id: string;
  name: string;
  canonical_name?: string | null;
  category?: string | null;
  label?: string | null;
  estimated_amount?: number | null;
  unit?: string | null;
};

export type AiInventoryStructureConflict = {
  type: "quantity" | "brand" | "duplicate" | "unit" | "other";
  message: string;
  existing_value: string | null;
  spoken_value: string | null;
};

export type AiInventoryStructureItem = {
  display_name: string;
  item_name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  matched_existing_id: string | null;
  confidence: "low" | "medium" | "high";
  notes: string[];
  conflicts: AiInventoryStructureConflict[];
};

export type AiInventoryStructureResult = {
  items: AiInventoryStructureItem[];
  potential_errors: AiInventoryStructureItem[];
  transcript_summary: string;
  warnings: string[];
};
