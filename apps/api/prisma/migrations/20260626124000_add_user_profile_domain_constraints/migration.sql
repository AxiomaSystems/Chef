-- User profile scalar fields are coded values in @cart/shared and validated by
-- API DTOs. These database constraints were applied and validated in Supabase
-- first with short lock timeouts, then recorded idempotently here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_householdSize_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_householdSize_allowed_chk"
    CHECK ("householdSize" IS NULL OR "householdSize" IN ('just_me', 'two_people', 'three_to_four_people', 'five_plus_people'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_kidsProfile_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_kidsProfile_allowed_chk"
    CHECK ("kidsProfile" IS NULL OR "kidsProfile" IN ('no_kids', 'toddlers', 'kids_5_to_12', 'teenagers'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_spiceLevel_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_spiceLevel_allowed_chk"
    CHECK ("spiceLevel" IS NULL OR "spiceLevel" IN ('none', 'mild', 'medium', 'hot', 'very_hot'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_cookingSkillLevel_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_cookingSkillLevel_allowed_chk"
    CHECK ("cookingSkillLevel" IS NULL OR "cookingSkillLevel" IN ('beginner', 'intermediate', 'confident', 'advanced'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_preferredCookingTime_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_preferredCookingTime_allowed_chk"
    CHECK ("preferredCookingTime" IS NULL OR "preferredCookingTime" IN ('under_15_min', '15_to_30_min', '30_to_45_min', 'up_to_1_hour', 'over_1_hour'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_calorieTrackingMode_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_calorieTrackingMode_allowed_chk"
    CHECK ("calorieTrackingMode" IS NULL OR "calorieTrackingMode" IN ('none', 'casual', 'calories', 'full_macros'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_weeklyBudget_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_weeklyBudget_allowed_chk"
    CHECK ("weeklyBudget" IS NULL OR "weeklyBudget" IN ('under_50', '50_to_100', '100_to_150', '150_to_200', 'no_budget_limit'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_shoppingMode_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_shoppingMode_allowed_chk"
    CHECK ("shoppingMode" IS NULL OR "shoppingMode" IN ('in_store', 'pickup', 'delivery', 'mixed'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_biggestCookingFrustration_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_biggestCookingFrustration_allowed_chk"
    CHECK ("biggestCookingFrustration" IS NULL OR "biggestCookingFrustration" IN ('save_recipes_but_do_not_cook', 'dont_know_what_to_make', 'grocery_runs_are_stressful', 'spend_too_much_on_food', 'make_mid_cook_mistakes', 'same_meals_on_repeat'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_aiPlanningOptimization_allowed_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_aiPlanningOptimization_allowed_chk"
    CHECK ("aiPlanningOptimization" IS NULL OR "aiPlanningOptimization" IN ('cost_reduction', 'trend_best_recipe'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_preferredZipCode_format_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_preferredZipCode_format_chk"
    CHECK ("preferredZipCode" IS NULL OR "preferredZipCode" ~ '^$|^[0-9]{5}(-[0-9]{4})?$')
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_preferredLatitude_range_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_preferredLatitude_range_chk"
    CHECK ("preferredLatitude" IS NULL OR ("preferredLatitude" >= -90 AND "preferredLatitude" <= 90))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_preferredLongitude_range_chk') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_preferredLongitude_range_chk"
    CHECK ("preferredLongitude" IS NULL OR ("preferredLongitude" >= -180 AND "preferredLongitude" <= 180))
    NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY[
    'User_householdSize_allowed_chk',
    'User_kidsProfile_allowed_chk',
    'User_spiceLevel_allowed_chk',
    'User_cookingSkillLevel_allowed_chk',
    'User_preferredCookingTime_allowed_chk',
    'User_calorieTrackingMode_allowed_chk',
    'User_weeklyBudget_allowed_chk',
    'User_shoppingMode_allowed_chk',
    'User_biggestCookingFrustration_allowed_chk',
    'User_aiPlanningOptimization_allowed_chk',
    'User_preferredZipCode_format_chk',
    'User_preferredLatitude_range_chk',
    'User_preferredLongitude_range_chk'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND convalidated IS FALSE
    ) THEN
      EXECUTE format('ALTER TABLE "User" VALIDATE CONSTRAINT %I', constraint_name);
    END IF;
  END LOOP;
END $$;
