-- Optimize Recipe Library pagination, owner tabs, taxonomy filters, and text search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Prisma-managed indexes mirrored from schema.prisma.
CREATE INDEX "BaseRecipe_ownerUserId_isSystemRecipe_forkedFromRecipeId_createdAt_id_idx"
  ON "BaseRecipe"("ownerUserId", "isSystemRecipe", "forkedFromRecipeId", "createdAt", "id");

CREATE INDEX "BaseRecipe_isSystemRecipe_ownerUserId_createdAt_id_idx"
  ON "BaseRecipe"("isSystemRecipe", "ownerUserId", "createdAt", "id");

CREATE INDEX "BaseRecipe_cuisineId_createdAt_id_idx"
  ON "BaseRecipe"("cuisineId", "createdAt", "id");

CREATE INDEX "RecipeTag_tagId_recipeId_idx"
  ON "RecipeTag"("tagId", "recipeId");

-- Trigram indexes for case-insensitive contains searches used by /api/v1/recipes?q=...
CREATE INDEX "BaseRecipe_name_trgm_idx"
  ON "BaseRecipe" USING GIN ("name" gin_trgm_ops);

CREATE INDEX "BaseRecipe_description_trgm_idx"
  ON "BaseRecipe" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "Cuisine_label_trgm_idx"
  ON "Cuisine" USING GIN ("label" gin_trgm_ops);

CREATE INDEX "Tag_name_trgm_idx"
  ON "Tag" USING GIN ("name" gin_trgm_ops);

CREATE INDEX "DishIngredient_canonicalIngredient_trgm_idx"
  ON "DishIngredient" USING GIN ("canonicalIngredient" gin_trgm_ops);

CREATE INDEX "DishIngredient_displayIngredient_trgm_idx"
  ON "DishIngredient" USING GIN ("displayIngredient" gin_trgm_ops);
