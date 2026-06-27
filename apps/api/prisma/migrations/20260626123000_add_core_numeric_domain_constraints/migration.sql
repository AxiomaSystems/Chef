-- Numeric domain constraints applied manually first with short lock timeouts,
-- then recorded idempotently here so Prisma migration history owns the change.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserGoal_priority_range_chk'
  ) THEN
    ALTER TABLE "UserGoal"
    ADD CONSTRAINT "UserGoal_priority_range_chk"
    CHECK ("priority" BETWEEN 1 AND 5)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RecipeStep_stepNumber_positive_chk'
  ) THEN
    ALTER TABLE "RecipeStep"
    ADD CONSTRAINT "RecipeStep_stepNumber_positive_chk"
    CHECK ("stepNumber" >= 1)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VisionObservation_confidence_probability_chk'
  ) THEN
    ALTER TABLE "VisionObservation"
    ADD CONSTRAINT "VisionObservation_confidence_probability_chk"
    CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'KitchenInventoryItem_estimatedAmount_nonnegative_chk'
  ) THEN
    ALTER TABLE "KitchenInventoryItem"
    ADD CONSTRAINT "KitchenInventoryItem_estimatedAmount_nonnegative_chk"
    CHECK ("estimatedAmount" IS NULL OR "estimatedAmount" >= 0)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DishIngredient_amount_nonnegative_chk'
  ) THEN
    ALTER TABLE "DishIngredient"
    ADD CONSTRAINT "DishIngredient_amount_nonnegative_chk"
    CHECK ("amount" >= 0)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DishIngredient_sortOrder_nonnegative_chk'
  ) THEN
    ALTER TABLE "DishIngredient"
    ADD CONSTRAINT "DishIngredient_sortOrder_nonnegative_chk"
    CHECK ("sortOrder" >= 0)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingCart_estimatedSubtotal_nonnegative_chk'
  ) THEN
    ALTER TABLE "ShoppingCart"
    ADD CONSTRAINT "ShoppingCart_estimatedSubtotal_nonnegative_chk"
    CHECK ("estimatedSubtotal" >= 0)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingCart_estimatedTotal_nonnegative_chk'
  ) THEN
    ALTER TABLE "ShoppingCart"
    ADD CONSTRAINT "ShoppingCart_estimatedTotal_nonnegative_chk"
    CHECK ("estimatedTotal" IS NULL OR "estimatedTotal" >= 0)
    NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserGoal_priority_range_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "UserGoal" VALIDATE CONSTRAINT "UserGoal_priority_range_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RecipeStep_stepNumber_positive_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "RecipeStep" VALIDATE CONSTRAINT "RecipeStep_stepNumber_positive_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VisionObservation_confidence_probability_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "VisionObservation" VALIDATE CONSTRAINT "VisionObservation_confidence_probability_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'KitchenInventoryItem_estimatedAmount_nonnegative_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_estimatedAmount_nonnegative_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DishIngredient_amount_nonnegative_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_amount_nonnegative_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DishIngredient_sortOrder_nonnegative_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_sortOrder_nonnegative_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ShoppingCart_estimatedSubtotal_nonnegative_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "ShoppingCart" VALIDATE CONSTRAINT "ShoppingCart_estimatedSubtotal_nonnegative_chk";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ShoppingCart_estimatedTotal_nonnegative_chk'
      AND convalidated IS FALSE
  ) THEN
    ALTER TABLE "ShoppingCart" VALIDATE CONSTRAINT "ShoppingCart_estimatedTotal_nonnegative_chk";
  END IF;
END $$;
