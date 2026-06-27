SET LOCAL lock_timeout = '5s';

ALTER TABLE "DishIngredient"
  ADD CONSTRAINT "DishIngredient_baseRecipeId_sortOrder_key"
  UNIQUE ("baseRecipeId", "sortOrder"),
  ADD CONSTRAINT "DishIngredient_amount_range_chk"
  CHECK ("amount" >= 0 AND "amount" <= 10000) NOT VALID,
  ADD CONSTRAINT "DishIngredient_sortOrder_range_chk"
  CHECK ("sortOrder" >= 0 AND "sortOrder" <= 79) NOT VALID,
  ADD CONSTRAINT "DishIngredient_canonicalIngredient_max_length_chk"
  CHECK (length("canonicalIngredient") <= 120) NOT VALID,
  ADD CONSTRAINT "DishIngredient_unit_max_length_chk"
  CHECK (length("unit") <= 32) NOT VALID,
  ADD CONSTRAINT "DishIngredient_displayIngredient_max_length_chk"
  CHECK ("displayIngredient" IS NULL OR length("displayIngredient") <= 180) NOT VALID,
  ADD CONSTRAINT "DishIngredient_preparation_max_length_chk"
  CHECK ("preparation" IS NULL OR length("preparation") <= 120) NOT VALID,
  ADD CONSTRAINT "DishIngredient_ingredientGroup_max_length_chk"
  CHECK ("ingredientGroup" IS NULL OR length("ingredientGroup") <= 80) NOT VALID;

ALTER TABLE "RecipeStep"
  ADD CONSTRAINT "RecipeStep_whatToDo_max_length_chk"
  CHECK (length("whatToDo") <= 1000) NOT VALID,
  ADD CONSTRAINT "RecipeStep_stepNumber_range_chk"
  CHECK ("stepNumber" >= 1 AND "stepNumber" <= 80) NOT VALID;

ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_amount_range_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_sortOrder_range_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_canonicalIngredient_max_length_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_unit_max_length_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_displayIngredient_max_length_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_preparation_max_length_chk";
ALTER TABLE "DishIngredient" VALIDATE CONSTRAINT "DishIngredient_ingredientGroup_max_length_chk";

ALTER TABLE "RecipeStep" VALIDATE CONSTRAINT "RecipeStep_whatToDo_max_length_chk";
ALTER TABLE "RecipeStep" VALIDATE CONSTRAINT "RecipeStep_stepNumber_range_chk";
