ALTER TABLE "Capture" ADD COLUMN "savedRecipeId" TEXT;

CREATE UNIQUE INDEX "Capture_savedRecipeId_key" ON "Capture"("savedRecipeId");
CREATE INDEX "Capture_savedRecipeId_idx" ON "Capture"("savedRecipeId");

ALTER TABLE "Capture"
  ADD CONSTRAINT "Capture_savedRecipeId_fkey"
  FOREIGN KEY ("savedRecipeId") REFERENCES "BaseRecipe"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
