-- Manual equivalent of the Prisma validation migration.
-- Run only after audit-meal-event-constraints.sql returns zero rows against
-- the target database.
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_mealLabel_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_sourceType_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_status_allowed_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_servings_positive_chk";
ALTER TABLE "MealEvent" VALIDATE CONSTRAINT "MealEvent_sortOrder_nonnegative_chk";
