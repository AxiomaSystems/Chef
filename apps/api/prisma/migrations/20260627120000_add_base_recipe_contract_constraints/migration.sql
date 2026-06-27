SET LOCAL lock_timeout = '5s';

ALTER TABLE "BaseRecipe"
  ADD CONSTRAINT "BaseRecipe_servings_range_chk"
  CHECK ("servings" >= 1 AND "servings" <= 100) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_name_max_length_chk"
  CHECK (length("name") <= 140) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_description_max_length_chk"
  CHECK ("description" IS NULL OR length("description") <= 1200) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_nutritionData_json_object_chk"
  CHECK (
    "nutritionData" IS NULL
    OR jsonb_typeof("nutritionData") IN ('object', 'null')
  ) NOT VALID;

ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_servings_range_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_name_max_length_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_description_max_length_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_nutritionData_json_object_chk";
