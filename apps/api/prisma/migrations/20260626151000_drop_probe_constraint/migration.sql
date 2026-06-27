SET LOCAL lock_timeout = '5s';

ALTER TABLE "DishIngredient"
  DROP CONSTRAINT IF EXISTS "DishIngredient_amount_nonnegative_chk_probe";
