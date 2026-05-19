import { SetMetadata } from '@nestjs/common';
import type { AiUsageCategory } from '@cart/shared';

export const AI_USAGE_CATEGORY_KEY = 'ai_usage_category';

export function AiUsageCategory(category: AiUsageCategory) {
  return SetMetadata(AI_USAGE_CATEGORY_KEY, category);
}
