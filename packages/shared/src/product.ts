export type Retailer = "walmart" | "kroger" | "instacart";

export type RetailerIntegrationStatus =
  | "configured"
  | "disabled"
  | "partner_required";

export type RetailerCapability = {
  retailer: Retailer;
  label: string;
  supports_product_search: boolean;
  supports_location_lookup: boolean;
  supports_cart_handoff: boolean;
  supports_native_checkout: boolean;
  requires_location: boolean;
  requires_api_key: boolean;
  status: RetailerIntegrationStatus;
  demo_priority: number;
  notes?: string;
};

export type ProductCandidate = {
  product_id: string;
  title: string;
  brand?: string;
  price: number;
  size_value?: number;
  size_unit?: string;
  quantity_text?: string;
  estimated_match_score?: number;
  url?: string;
  image_url?: string;
};

export type RetailerSearchCandidate = {
  retailer: Retailer;
  query: string;
  canonical_ingredient: string;
  candidates: ProductCandidate[];
};

export type MatchedIngredientProduct = {
  kind?: "ingredient_match" | "manual_item";
  canonical_ingredient: string;
  manual_label?: string;
  needed_amount: number;
  needed_unit: string;
  matched_amount?: number;
  matched_unit?: string;
  purchase_unit_hint?: string;
  walmart_search_query: string;
  selected_product: ProductCandidate | null;
  selected_quantity?: number;
  estimated_line_total?: number;
  fallback_used?: boolean;
  notes?: string;
};

export type RetailerProductSearchResponse = {
  retailer: Retailer;
  query: string;
  candidates: ProductCandidate[];
};
