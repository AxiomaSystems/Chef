-- Mirror the shared/API MealEvent contract at the database layer.
-- NOT VALID avoids blocking deploy if old rows contain unexpected values, while
-- still enforcing the constraints for new and updated rows.
ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_mealLabel_allowed_chk"
CHECK ("mealLabel" IN ('breakfast', 'lunch', 'dinner', 'snack', 'prep', 'leftover', 'custom'))
NOT VALID;

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_sourceType_allowed_chk"
CHECK ("sourceType" IN ('recipe', 'manual', 'leftover', 'eat_out', 'prep'))
NOT VALID;

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_status_allowed_chk"
CHECK ("status" IN ('planned', 'cooked', 'eaten', 'skipped'))
NOT VALID;

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_servings_positive_chk"
CHECK ("servings" >= 1)
NOT VALID;

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_sortOrder_nonnegative_chk"
CHECK ("sortOrder" >= 0)
NOT VALID;
