-- Expand the existing meal enum for recipe browsing/planning use cases.
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'brunch';
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'snack';
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'dessert';
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'side';
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'appetizer';
ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'drink';

CREATE TYPE "RecipeDifficulty" AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE "RecipeCostTier" AS ENUM ('low', 'medium', 'high');

CREATE TYPE "RecipeSourceType" AS ENUM (
  'user_created',
  'ai_generated',
  'recipe_url',
  'social_url',
  'pasted_text',
  'image',
  'unknown'
);

CREATE TYPE "RecipeReviewStatus" AS ENUM ('draft', 'needs_review', 'reviewed', 'trusted');

CREATE TYPE "RecipeExtractionConfidence" AS ENUM ('low', 'medium', 'high');

CREATE TABLE "RecipePlanningProfile" (
  "recipeId" TEXT NOT NULL,
  "difficulty" "RecipeDifficulty",
  "difficultyReason" TEXT,
  "prepTimeMinutes" INTEGER,
  "cookTimeMinutes" INTEGER,
  "totalTimeMinutes" INTEGER,
  "estimatedCostTier" "RecipeCostTier",
  "costNotes" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecipePlanningProfile_pkey" PRIMARY KEY ("recipeId"),
  CONSTRAINT "RecipePlanningProfile_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "BaseRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipePlanningProfile_difficultyReason_length_chk" CHECK ("difficultyReason" IS NULL OR char_length("difficultyReason") <= 300),
  CONSTRAINT "RecipePlanningProfile_prepTimeMinutes_domain_chk" CHECK ("prepTimeMinutes" IS NULL OR ("prepTimeMinutes" >= 0 AND "prepTimeMinutes" <= 2880)),
  CONSTRAINT "RecipePlanningProfile_cookTimeMinutes_domain_chk" CHECK ("cookTimeMinutes" IS NULL OR ("cookTimeMinutes" >= 0 AND "cookTimeMinutes" <= 2880)),
  CONSTRAINT "RecipePlanningProfile_totalTimeMinutes_domain_chk" CHECK ("totalTimeMinutes" IS NULL OR ("totalTimeMinutes" >= 0 AND "totalTimeMinutes" <= 2880)),
  CONSTRAINT "RecipePlanningProfile_costNotes_json_array_chk" CHECK (jsonb_typeof("costNotes") = 'array')
);

CREATE TABLE "RecipeMealType" (
  "recipeId" TEXT NOT NULL,
  "mealType" "MealType" NOT NULL,

  CONSTRAINT "RecipeMealType_pkey" PRIMARY KEY ("recipeId", "mealType"),
  CONSTRAINT "RecipeMealType_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "BaseRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RecipeProvenanceProfile" (
  "recipeId" TEXT NOT NULL,
  "sourceType" "RecipeSourceType" NOT NULL DEFAULT 'user_created',
  "sourceUrl" TEXT,
  "sourceName" TEXT,
  "attributionLabel" TEXT,
  "reviewStatus" "RecipeReviewStatus" NOT NULL DEFAULT 'reviewed',
  "extractionConfidence" "RecipeExtractionConfidence",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecipeProvenanceProfile_pkey" PRIMARY KEY ("recipeId"),
  CONSTRAINT "RecipeProvenanceProfile_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "BaseRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipeProvenanceProfile_sourceUrl_length_chk" CHECK ("sourceUrl" IS NULL OR char_length("sourceUrl") <= 2048),
  CONSTRAINT "RecipeProvenanceProfile_sourceName_length_chk" CHECK ("sourceName" IS NULL OR char_length("sourceName") <= 180),
  CONSTRAINT "RecipeProvenanceProfile_attributionLabel_length_chk" CHECK ("attributionLabel" IS NULL OR char_length("attributionLabel") <= 240)
);

CREATE INDEX "RecipePlanningProfile_difficulty_idx" ON "RecipePlanningProfile"("difficulty");
CREATE INDEX "RecipePlanningProfile_estimatedCostTier_idx" ON "RecipePlanningProfile"("estimatedCostTier");
CREATE INDEX "RecipePlanningProfile_effectiveTotalTime_idx" ON "RecipePlanningProfile"((COALESCE("totalTimeMinutes", "prepTimeMinutes" + "cookTimeMinutes")));
CREATE INDEX "RecipeMealType_mealType_recipeId_idx" ON "RecipeMealType"("mealType", "recipeId");
CREATE INDEX "RecipeProvenanceProfile_sourceType_idx" ON "RecipeProvenanceProfile"("sourceType");
CREATE INDEX "RecipeProvenanceProfile_reviewStatus_idx" ON "RecipeProvenanceProfile"("reviewStatus");
