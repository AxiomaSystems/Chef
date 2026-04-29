-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner');

-- AlterTable
ALTER TABLE "MealPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;
