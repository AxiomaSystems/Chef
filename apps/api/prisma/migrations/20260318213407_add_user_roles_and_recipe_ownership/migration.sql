/*
  Warnings:

  - You are about to drop the column `userId` on the `BaseRecipe` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "BaseRecipe" DROP COLUMN "userId",
ADD COLUMN     "isSystemRecipe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerUserId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BaseRecipe_ownerUserId_createdAt_idx" ON "BaseRecipe"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BaseRecipe_isSystemRecipe_createdAt_idx" ON "BaseRecipe"("isSystemRecipe", "createdAt");

-- AddForeignKey
ALTER TABLE "BaseRecipe" ADD CONSTRAINT "BaseRecipe_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
