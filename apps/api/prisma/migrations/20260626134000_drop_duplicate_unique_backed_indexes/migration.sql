-- These non-unique indexes duplicate unique btree indexes on the same columns:
-- - MealPlan_userId_weekStart_key
-- - Capture_savedRecipeId_key
--
-- The unique indexes still support lookups and enforce the same access path.
DROP INDEX IF EXISTS "MealPlan_userId_weekStart_idx";
DROP INDEX IF EXISTS "Capture_savedRecipeId_idx";
