-- Audit rows that would prevent validating the MealEvent database constraints.
-- Expected result before running the validation migration: zero rows.
SELECT
  "id",
  "userId",
  "date",
  "mealLabel",
  "sourceType",
  "status",
  "servings",
  "sortOrder",
  ARRAY_REMOVE(ARRAY[
    CASE
      WHEN "mealLabel" NOT IN ('breakfast', 'lunch', 'dinner', 'snack', 'prep', 'leftover', 'custom')
      THEN 'invalid_mealLabel'
    END,
    CASE
      WHEN "sourceType" NOT IN ('recipe', 'manual', 'leftover', 'eat_out', 'prep')
      THEN 'invalid_sourceType'
    END,
    CASE
      WHEN "status" NOT IN ('planned', 'cooked', 'eaten', 'skipped')
      THEN 'invalid_status'
    END,
    CASE
      WHEN "servings" < 1
      THEN 'invalid_servings'
    END,
    CASE
      WHEN "sortOrder" < 0
      THEN 'invalid_sortOrder'
    END
  ], NULL) AS violations
FROM "MealEvent"
WHERE "mealLabel" NOT IN ('breakfast', 'lunch', 'dinner', 'snack', 'prep', 'leftover', 'custom')
   OR "sourceType" NOT IN ('recipe', 'manual', 'leftover', 'eat_out', 'prep')
   OR "status" NOT IN ('planned', 'cooked', 'eaten', 'skipped')
   OR "servings" < 1
   OR "sortOrder" < 0
ORDER BY "date" DESC, "createdAt" DESC;
