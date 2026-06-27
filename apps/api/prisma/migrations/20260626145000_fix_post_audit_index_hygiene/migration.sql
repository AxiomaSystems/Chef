SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS "UserPreferredTag_tagId_tagScope_idx"
  ON "UserPreferredTag"("tagId", "tagScope");

DROP INDEX IF EXISTS "UserPreferredTag_tagId_idx";
DROP INDEX IF EXISTS "DishIngredient_baseRecipeId_sortOrder_idx";
