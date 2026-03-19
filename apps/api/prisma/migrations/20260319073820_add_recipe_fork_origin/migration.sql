-- AlterTable
ALTER TABLE "BaseRecipe" ADD COLUMN     "forkedFromRecipeId" TEXT;

-- CreateIndex
CREATE INDEX "BaseRecipe_forkedFromRecipeId_idx" ON "BaseRecipe"("forkedFromRecipeId");

-- AddForeignKey
ALTER TABLE "BaseRecipe" ADD CONSTRAINT "BaseRecipe_forkedFromRecipeId_fkey" FOREIGN KEY ("forkedFromRecipeId") REFERENCES "BaseRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
