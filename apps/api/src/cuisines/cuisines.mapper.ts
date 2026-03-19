import type { Cuisine } from '@cart/shared';
import type { Cuisine as PrismaCuisine } from '../../generated/prisma/index.js';

export const mapCuisine = (cuisine: PrismaCuisine): Cuisine => ({
  id: cuisine.id,
  slug: cuisine.slug,
  label: cuisine.label,
  kind: cuisine.kind,
  created_at: cuisine.createdAt.toISOString(),
  updated_at: cuisine.updatedAt.toISOString(),
});
