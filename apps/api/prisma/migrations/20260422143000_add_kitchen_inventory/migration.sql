CREATE TYPE "KitchenInventorySource" AS ENUM ('manual', 'cart', 'vision', 'receipt', 'inferred', 'seed');

CREATE TYPE "KitchenInventoryConfidence" AS ENUM ('low', 'medium', 'high');

CREATE TABLE "Ingredient" (
  "id" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "aliases" JSONB,
  "category" TEXT,
  "defaultUnit" TEXT,
  "visionLabels" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenInventoryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "label" TEXT,
  "estimatedAmount" DOUBLE PRECISION,
  "unit" TEXT,
  "source" "KitchenInventorySource" NOT NULL DEFAULT 'manual',
  "confidence" "KitchenInventoryConfidence" NOT NULL DEFAULT 'medium',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KitchenInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");
CREATE INDEX "Ingredient_canonicalName_idx" ON "Ingredient"("canonicalName");
CREATE INDEX "Ingredient_category_canonicalName_idx" ON "Ingredient"("category", "canonicalName");
CREATE UNIQUE INDEX "KitchenInventoryItem_userId_ingredientId_key" ON "KitchenInventoryItem"("userId", "ingredientId");
CREATE INDEX "KitchenInventoryItem_userId_createdAt_idx" ON "KitchenInventoryItem"("userId", "createdAt");
CREATE INDEX "KitchenInventoryItem_ingredientId_idx" ON "KitchenInventoryItem"("ingredientId");

ALTER TABLE "KitchenInventoryItem"
  ADD CONSTRAINT "KitchenInventoryItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitchenInventoryItem"
  ADD CONSTRAINT "KitchenInventoryItem_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
