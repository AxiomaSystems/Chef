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

export const INVENTORY_UNIT_OPTIONS = [
  "unit",
  "lb",
  "oz",
  "g",
  "kg",
  "cup",
  "tbsp",
  "tsp",
  "bunch",
  "slice",
  "can",
  "jar",
  "bottle",
  "carton",
  "dozen",
  "ear",
  "bag",
] as const;

export type InventoryUnit = (typeof INVENTORY_UNIT_OPTIONS)[number];

export const DEFAULT_INVENTORY_AMOUNT_BY_UNIT: Record<InventoryUnit, number> = {
  unit: 1,
  lb: 1,
  oz: 8,
  g: 500,
  kg: 1,
  cup: 1,
  tbsp: 1,
  tsp: 1,
  bunch: 1,
  slice: 4,
  can: 1,
  jar: 1,
  bottle: 1,
  carton: 1,
  dozen: 1,
  ear: 2,
  bag: 1,
};

export const INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  protein: "Proteins",
  proteins: "Proteins",
  produce: "Produce",
  vegetable: "Vegetables",
  vegetables: "Vegetables",
  fruit: "Fruits",
  fruits: "Fruits",
  "dairy-eggs": "Dairy & Eggs",
  dairy: "Dairy & Eggs",
  grains: "Grains & Bread",
  grain: "Grains & Bread",
  pantry: "Pantry Staples",
  "pantry-staples": "Pantry Staples",
  condiments: "Oils & Condiments",
  "oils-condiments": "Oils & Condiments",
  spices: "Spices & Herbs",
  "spices-herbs": "Spices & Herbs",
  nuts: "Nuts & Seeds",
  "nuts-seeds": "Nuts & Seeds",
};

export function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeIngredientSlug(name: string): string {
  return normalizeIngredientName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeIngredientKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferIngredientCategory(name: string): string {
  const value = normalizeIngredientName(name);

  if (
    /(chicken|beef|pork|bacon|turkey|lamb|fish|sirloin|fillet|salmon|tuna|shrimp|crab|lobster|scallop|cod|tofu|tempeh|lentil|chickpea|bean|edamame)/.test(
      value,
    )
  ) {
    return "protein";
  }

  if (
    /(milk|cheese|egg|cream|yogurt|butter|mozzarella|parmesan|feta|brie|gouda|ricotta|mascarpone)/.test(
      value,
    )
  ) {
    return "dairy-eggs";
  }

  if (
    /(apple|banana|lemon|lime|orange|strawberry|blueberry|raspberry|mango|avocado|grape|pineapple|watermelon|peach|pear|plum|kiwi|papaya|coconut|cherry|pomegranate|fig|grapefruit|cantaloupe)/.test(
      value,
    )
  ) {
    return "fruit";
  }

  if (
    /(onion|garlic|tomato|pepper|broccoli|spinach|kale|carrot|celery|cucumber|zucchini|eggplant|mushroom|asparagus|pea|corn|cauliflower|cabbage|lettuce|arugula|potato|beet|artichoke|leek|bok choy|radish|turnip|parsnip|aji|cilantro|parsley|basil|chive|dill)/.test(
      value,
    )
  ) {
    return "produce";
  }

  if (
    /(rice|bread|fries|pasta|spaghetti|penne|tortilla|oat|quinoa|barley|couscous|breadcrumb|panko|pita|naan|flour|cornmeal)/.test(
      value,
    )
  ) {
    return "pantry";
  }

  if (
    /(oil|sauce|vinegar|paste|ketchup|mustard|mayonnaise|sriracha|tahini|pesto|broth|stock|canned|sugar|honey|syrup|baking|cornstarch|yeast|cocoa|chocolate|peanut butter|almond butter|jam|tapenade|caper|pecan|almond|walnut|cashew|pistachio|seed)/.test(
      value,
    )
  ) {
    return "pantry";
  }

  if (
    /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|thyme|rosemary|bay|chili|cayenne|powder|ginger|nutmeg|clove|cardamom|coriander|fennel|sage|allspice|anise|vanilla|saffron|curry|masala|za'atar|sumac|harissa|ras el hanout)/.test(
      value,
    )
  ) {
    return "spices";
  }

  return "other";
}

export function inferInventoryUnit(name: string): InventoryUnit {
  const value = normalizeIngredientName(name);

  if (
    /(chicken|beef|pork|turkey|lamb|salmon|tuna|shrimp|fish|cod|crab|lobster|scallop)/.test(
      value,
    )
  ) {
    return "lb";
  }

  if (/(egg|eggs)/.test(value)) return "dozen";
  if (/(milk|cream|yogurt|broth|stock|coconut milk)/.test(value)) {
    return "carton";
  }
  if (
    /(cheese|butter|tofu|tempeh|bacon|nut|seed|almond|walnut|cashew|pecan|pistachio)/.test(
      value,
    )
  ) {
    return "oz";
  }
  if (
    /(rice|pasta|oat|quinoa|barley|couscous|flour|cornmeal|sugar|lentil|chickpea|bean)/.test(
      value,
    )
  ) {
    return "cup";
  }
  if (/(bread|sourdough|tortilla|pita|naan)/.test(value)) return "slice";
  if (/(cilantro|parsley|basil|chive|dill|rosemary|thyme|sage)/.test(value)) {
    return "bunch";
  }
  if (
    /(oil|sauce|vinegar|ketchup|mustard|mayonnaise|sriracha|honey|syrup)/.test(
      value,
    )
  ) {
    return "bottle";
  }
  if (/(jar|paste|jam|tapenade|caper|canned|tomatoes)/.test(value)) {
    return "jar";
  }
  if (
    /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|powder|extract|saffron|sumac|harissa)/.test(
      value,
    )
  ) {
    return "jar";
  }
  if (/corn/.test(value)) return "ear";

  return "unit";
}

export function inferInventoryAmount(unit: string): number {
  return DEFAULT_INVENTORY_AMOUNT_BY_UNIT[unit as InventoryUnit] ?? 1;
}

export function displayIngredientCategory(
  name: string,
  rawCategory?: string,
): string {
  const normalizedCategory = rawCategory?.trim().toLowerCase();

  if (!normalizedCategory || normalizedCategory === "other") {
    const inferred = inferIngredientCategory(name);
    return INGREDIENT_CATEGORY_LABELS[inferred] ?? "Other";
  }

  return (
    INGREDIENT_CATEGORY_LABELS[normalizedCategory] ??
    toTitleCase(rawCategory!.trim())
  );
}

function toTitleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export type KitchenInventorySource =
  | "manual"
  | "cart"
  | "vision"
  | "receipt"
  | "inferred"
  | "seed";

export type KitchenInventoryConfidence = "low" | "medium" | "high";

export type InventoryReviewStatus =
  | "pending"
  | "active"
  | "discarded"
  | "archived";

export type KitchenInventoryItem = {
  id: string;
  user_id: string;
  ingredient_id?: string;
  ingredient?: Ingredient;
  display_name: string;
  normalized_name: string;
  label?: string;
  estimated_amount?: number;
  unit?: string;
  source: KitchenInventorySource;
  confidence: KitchenInventoryConfidence;
  review_status: InventoryReviewStatus;
  created_at: string;
  updated_at: string;
};

export type AddKitchenInventoryItemRequest = {
  ingredient_id?: string;
  canonical_name?: string;
  display_name?: string;
  label?: string;
  estimated_amount?: number;
  unit?: string;
  review_status?: InventoryReviewStatus;
};
