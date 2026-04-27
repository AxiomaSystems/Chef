export type Ingredient = {
  id: string;
  canonical_name: string;
  slug: string;
  aliases?: string[];
  category?: string;
  default_unit?: string;
  vision_labels?: string[];
  created_at: string;
  updated_at: string;
};

export type KitchenInventorySource =
  | "manual"
  | "cart"
  | "vision"
  | "receipt"
  | "inferred"
  | "seed";

export type KitchenInventoryConfidence = "low" | "medium" | "high";

export type KitchenInventoryItem = {
  id: string;
  user_id: string;
  ingredient_id: string;
  ingredient: Ingredient;
  label?: string;
  estimated_amount?: number;
  unit?: string;
  source: KitchenInventorySource;
  confidence: KitchenInventoryConfidence;
  created_at: string;
  updated_at: string;
};

export type AddKitchenInventoryItemRequest = {
  ingredient_id?: string;
  canonical_name?: string;
  label?: string;
};
