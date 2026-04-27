import type { Ingredient, KitchenInventoryItem } from '@cart/shared';

type IngredientRecord = {
  id: string;
  canonicalName: string;
  slug: string;
  aliases: unknown;
  category: string | null;
  defaultUnit: string | null;
  visionLabels: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type KitchenInventoryItemRecord = {
  id: string;
  userId: string;
  ingredientId: string;
  ingredient: IngredientRecord;
  label: string | null;
  estimatedAmount: number | null;
  unit: string | null;
  source: KitchenInventoryItem['source'];
  confidence: KitchenInventoryItem['confidence'];
  createdAt: Date;
  updatedAt: Date;
};

function mapStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length > 0 ? strings : undefined;
}

export function mapIngredient(input: IngredientRecord): Ingredient {
  return {
    id: input.id,
    canonical_name: input.canonicalName,
    slug: input.slug,
    aliases: mapStringArray(input.aliases),
    category: input.category ?? undefined,
    default_unit: input.defaultUnit ?? undefined,
    vision_labels: mapStringArray(input.visionLabels),
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
  };
}

export function mapKitchenInventoryItem(
  input: KitchenInventoryItemRecord,
): KitchenInventoryItem {
  return {
    id: input.id,
    user_id: input.userId,
    ingredient_id: input.ingredientId,
    ingredient: mapIngredient(input.ingredient),
    label: input.label ?? undefined,
    estimated_amount: input.estimatedAmount ?? undefined,
    unit: input.unit ?? undefined,
    source: input.source,
    confidence: input.confidence,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
  };
}
