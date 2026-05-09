-- Link recipe ingredient rows to canonical Ingredient records while keeping
-- canonicalIngredient as the required recipe-line snapshot/fallback.
ALTER TABLE "DishIngredient" ADD COLUMN "ingredientId" TEXT;

UPDATE "DishIngredient" AS dish_ingredient
SET "ingredientId" = ingredient."id"
FROM "Ingredient" AS ingredient
WHERE ingredient."slug" = trim(
  both '-' from regexp_replace(
    regexp_replace(lower(trim(dish_ingredient."canonicalIngredient")), '\s+', ' ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  )
);

CREATE INDEX "DishIngredient_ingredientId_idx" ON "DishIngredient"("ingredientId");
CREATE INDEX "DishIngredient_baseRecipeId_ingredientId_idx" ON "DishIngredient"("baseRecipeId", "ingredientId");

ALTER TABLE "DishIngredient"
  ADD CONSTRAINT "DishIngredient_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
