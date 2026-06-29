-- Add richer recipe execution metadata without changing existing measured rows.
CREATE TYPE "RecipeTemperatureUnit" AS ENUM ('F', 'C');

ALTER TABLE "DishIngredient"
  ALTER COLUMN "amount" DROP NOT NULL,
  ALTER COLUMN "unit" DROP NOT NULL,
  ADD COLUMN "amountText" TEXT,
  ADD COLUMN "substitutions" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "RecipeStep"
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "temperature" INTEGER,
  ADD COLUMN "temperatureUnit" "RecipeTemperatureUnit",
  ADD COLUMN "timerLabel" TEXT,
  ADD COLUMN "equipment" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "RecipeStepIngredient" (
  "recipeStepId" TEXT NOT NULL,
  "dishIngredientId" TEXT NOT NULL,

  CONSTRAINT "RecipeStepIngredient_pkey" PRIMARY KEY ("recipeStepId", "dishIngredientId"),
  CONSTRAINT "RecipeStepIngredient_recipeStepId_fkey" FOREIGN KEY ("recipeStepId") REFERENCES "RecipeStep"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipeStepIngredient_dishIngredientId_fkey" FOREIGN KEY ("dishIngredientId") REFERENCES "DishIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RecipeStepIngredient_recipeStepId_idx" ON "RecipeStepIngredient"("recipeStepId");
CREATE INDEX "RecipeStepIngredient_dishIngredientId_idx" ON "RecipeStepIngredient"("dishIngredientId");

ALTER TABLE "DishIngredient"
  ADD CONSTRAINT "DishIngredient_quantity_present_check"
  CHECK (
    ("amount" IS NOT NULL AND "unit" IS NOT NULL AND length(trim("unit")) > 0)
    OR ("amountText" IS NOT NULL AND length(trim("amountText")) > 0)
  ),
  ADD CONSTRAINT "DishIngredient_amount_nonnegative_check"
  CHECK ("amount" IS NULL OR "amount" >= 0),
  ADD CONSTRAINT "DishIngredient_amount_text_length_check"
  CHECK ("amountText" IS NULL OR length("amountText") <= 80),
  ADD CONSTRAINT "DishIngredient_substitutions_array_check"
  CHECK (jsonb_typeof("substitutions") = 'array' AND jsonb_array_length("substitutions") <= 10);

ALTER TABLE "RecipeStep"
  ADD CONSTRAINT "RecipeStep_duration_positive_check"
  CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0),
  ADD CONSTRAINT "RecipeStep_temperature_pair_check"
  CHECK (("temperature" IS NULL AND "temperatureUnit" IS NULL) OR ("temperature" IS NOT NULL AND "temperatureUnit" IS NOT NULL)),
  ADD CONSTRAINT "RecipeStep_timer_label_length_check"
  CHECK ("timerLabel" IS NULL OR length("timerLabel") <= 120),
  ADD CONSTRAINT "RecipeStep_equipment_array_check"
  CHECK (jsonb_typeof("equipment") = 'array' AND jsonb_array_length("equipment") <= 10);

CREATE OR REPLACE FUNCTION recipe_step_ingredient_same_recipe()
RETURNS trigger AS $$
DECLARE
  step_recipe_id TEXT;
  ingredient_recipe_id TEXT;
BEGIN
  SELECT "baseRecipeId" INTO step_recipe_id
  FROM "RecipeStep"
  WHERE "id" = NEW."recipeStepId";

  SELECT "baseRecipeId" INTO ingredient_recipe_id
  FROM "DishIngredient"
  WHERE "id" = NEW."dishIngredientId";

  IF step_recipe_id IS NULL OR ingredient_recipe_id IS NULL OR step_recipe_id <> ingredient_recipe_id THEN
    RAISE EXCEPTION 'RecipeStepIngredient rows must link rows from the same recipe';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RecipeStepIngredient_same_recipe_trigger"
BEFORE INSERT OR UPDATE ON "RecipeStepIngredient"
FOR EACH ROW EXECUTE FUNCTION recipe_step_ingredient_same_recipe();
