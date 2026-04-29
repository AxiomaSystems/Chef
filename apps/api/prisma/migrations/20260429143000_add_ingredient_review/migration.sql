CREATE TABLE "IngredientReview" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IngredientReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngredientReview_cartId_key" ON "IngredientReview"("cartId");
CREATE INDEX "IngredientReview_createdAt_idx" ON "IngredientReview"("createdAt");

ALTER TABLE "IngredientReview"
  ADD CONSTRAINT "IngredientReview_cartId_fkey"
  FOREIGN KEY ("cartId")
  REFERENCES "Cart"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
