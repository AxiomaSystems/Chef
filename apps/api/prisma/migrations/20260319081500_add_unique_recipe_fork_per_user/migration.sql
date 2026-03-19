CREATE UNIQUE INDEX "BaseRecipe_ownerUserId_forkedFromRecipeId_key"
ON "BaseRecipe"("ownerUserId", "forkedFromRecipeId");
