-- Add indexes for launch-critical per-user reads.
-- These match current API access paths and do not change table shape or contracts.

CREATE INDEX "UserFoodRule_userId_strictness_createdAt_idx"
ON "UserFoodRule"("userId", "strictness", "createdAt");

CREATE INDEX "UserGoal_userId_priority_createdAt_idx"
ON "UserGoal"("userId", "priority", "createdAt");

CREATE INDEX "UserPantryStaple_userId_createdAt_idx"
ON "UserPantryStaple"("userId", "createdAt");

CREATE INDEX "KitchenInventoryItem_userId_updatedAt_idx"
ON "KitchenInventoryItem"("userId", "updatedAt");
