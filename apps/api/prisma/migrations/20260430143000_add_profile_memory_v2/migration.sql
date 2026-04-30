-- CreateEnum
CREATE TYPE "UserFoodRuleKind" AS ENUM ('dietary_constraint', 'ingredient_preference', 'texture_preference');

-- CreateEnum
CREATE TYPE "UserFoodRuleAction" AS ENUM ('prefer', 'dislike', 'avoid', 'require');

-- CreateEnum
CREATE TYPE "UserRuleStrictness" AS ENUM ('soft', 'hard');

-- CreateEnum
CREATE TYPE "UserMemorySource" AS ENUM ('onboarding', 'manual', 'behavior', 'inferred', 'import');

-- CreateEnum
CREATE TYPE "UserMemoryConfidence" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "UserGoalKind" AS ENUM ('save_money', 'save_time', 'eat_healthier', 'hit_protein', 'reduce_waste', 'try_new_foods', 'cook_more_at_home', 'meal_prep', 'spend_less_on_takeout');

-- CreateEnum
CREATE TYPE "UserGoalTimeframe" AS ENUM ('default_timeframe', 'this_week', 'long_term');

-- CreateTable
CREATE TABLE "UserFoodRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UserFoodRuleKind" NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "ingredientId" TEXT,
    "tagId" TEXT,
    "action" "UserFoodRuleAction" NOT NULL,
    "strictness" "UserRuleStrictness" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "source" "UserMemorySource" NOT NULL,
    "confidence" "UserMemoryConfidence" NOT NULL DEFAULT 'high',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFoodRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" "UserGoalKind" NOT NULL,
    "priority" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "timeframe" "UserGoalTimeframe" NOT NULL DEFAULT 'default_timeframe',
    "source" "UserMemorySource" NOT NULL DEFAULT 'onboarding',
    "confidence" "UserMemoryConfidence" NOT NULL DEFAULT 'high',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPantryStaple" (
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "source" "UserMemorySource" NOT NULL DEFAULT 'onboarding',
    "confidence" "UserMemoryConfidence" NOT NULL DEFAULT 'high',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPantryStaple_pkey" PRIMARY KEY ("userId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFoodRule_userId_dedupeKey_key" ON "UserFoodRule"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "UserFoodRule_userId_kind_idx" ON "UserFoodRule"("userId", "kind");

-- CreateIndex
CREATE INDEX "UserFoodRule_userId_strictness_idx" ON "UserFoodRule"("userId", "strictness");

-- CreateIndex
CREATE INDEX "UserFoodRule_userId_active_startsAt_expiresAt_idx" ON "UserFoodRule"("userId", "active", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserFoodRule_ingredientId_idx" ON "UserFoodRule"("ingredientId");

-- CreateIndex
CREATE INDEX "UserFoodRule_tagId_idx" ON "UserFoodRule"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGoal_userId_goal_timeframe_key" ON "UserGoal"("userId", "goal", "timeframe");

-- CreateIndex
CREATE INDEX "UserGoal_userId_active_priority_idx" ON "UserGoal"("userId", "active", "priority");

-- CreateIndex
CREATE INDEX "UserGoal_userId_active_startsAt_expiresAt_idx" ON "UserGoal"("userId", "active", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserPantryStaple_ingredientId_idx" ON "UserPantryStaple"("ingredientId");

-- AddForeignKey
ALTER TABLE "UserFoodRule" ADD CONSTRAINT "UserFoodRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFoodRule" ADD CONSTRAINT "UserFoodRule_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFoodRule" ADD CONSTRAINT "UserFoodRule_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPantryStaple" ADD CONSTRAINT "UserPantryStaple_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPantryStaple" ADD CONSTRAINT "UserPantryStaple_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS for Supabase public tables. NestJS/Prisma remains the application API.
ALTER TABLE "UserFoodRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPantryStaple" ENABLE ROW LEVEL SECURITY;
