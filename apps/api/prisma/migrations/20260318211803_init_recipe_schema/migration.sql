-- CreateTable
CREATE TABLE "BaseRecipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "cuisine" TEXT,
    "description" TEXT,
    "servings" INTEGER NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaseRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishIngredient" (
    "id" TEXT NOT NULL,
    "baseRecipeId" TEXT NOT NULL,
    "canonicalIngredient" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "displayIngredient" TEXT,
    "preparation" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "ingredientGroup" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeStep" (
    "id" TEXT NOT NULL,
    "baseRecipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "whatToDo" TEXT NOT NULL,

    CONSTRAINT "RecipeStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DishIngredient_baseRecipeId_sortOrder_idx" ON "DishIngredient"("baseRecipeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeStep_baseRecipeId_stepNumber_key" ON "RecipeStep"("baseRecipeId", "stepNumber");

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_baseRecipeId_fkey" FOREIGN KEY ("baseRecipeId") REFERENCES "BaseRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeStep" ADD CONSTRAINT "RecipeStep_baseRecipeId_fkey" FOREIGN KEY ("baseRecipeId") REFERENCES "BaseRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
