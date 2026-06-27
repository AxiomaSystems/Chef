-- The production Supabase audit returned zero invalid MealEvent rows before
-- this validation migration was added.
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_mealLabel_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_sourceType_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_status_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_servings_positive_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_sortOrder_nonnegative_chk";
