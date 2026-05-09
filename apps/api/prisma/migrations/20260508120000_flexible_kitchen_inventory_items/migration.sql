CREATE TYPE "InventoryReviewStatus" AS ENUM ('pending', 'active', 'discarded', 'archived');

ALTER TABLE "KitchenInventoryItem" DROP CONSTRAINT "KitchenInventoryItem_ingredientId_fkey";
DROP INDEX IF EXISTS "KitchenInventoryItem_userId_ingredientId_key";

ALTER TABLE "KitchenInventoryItem"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "normalizedName" TEXT,
  ADD COLUMN "reviewStatus" "InventoryReviewStatus" NOT NULL DEFAULT 'active',
  ALTER COLUMN "ingredientId" DROP NOT NULL;

UPDATE "KitchenInventoryItem" AS item
SET
  "displayName" = COALESCE(NULLIF(trim(item."label"), ''), ingredient."canonicalName", 'Inventory item'),
  "normalizedName" = lower(
    regexp_replace(
      COALESCE(NULLIF(trim(item."label"), ''), ingredient."canonicalName", 'Inventory item'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  )
FROM "Ingredient" AS ingredient
WHERE item."ingredientId" = ingredient."id";

UPDATE "KitchenInventoryItem"
SET
  "displayName" = COALESCE(NULLIF(trim("label"), ''), 'Inventory item'),
  "normalizedName" = lower(
    regexp_replace(
      COALESCE(NULLIF(trim("label"), ''), 'Inventory item'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  )
WHERE "displayName" IS NULL OR "normalizedName" IS NULL;

ALTER TABLE "KitchenInventoryItem"
  ALTER COLUMN "displayName" SET NOT NULL,
  ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE INDEX "KitchenInventoryItem_userId_reviewStatus_updatedAt_idx" ON "KitchenInventoryItem"("userId", "reviewStatus", "updatedAt");
CREATE INDEX "KitchenInventoryItem_userId_normalizedName_idx" ON "KitchenInventoryItem"("userId", "normalizedName");

ALTER TABLE "KitchenInventoryItem"
  ADD CONSTRAINT "KitchenInventoryItem_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
