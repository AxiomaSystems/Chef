CREATE TYPE "VisionObservationAction" AS ENUM (
  'pending',
  'added_to_inventory',
  'renamed',
  'discarded',
  'resolved_to_ingredient'
);

CREATE TABLE "VisionObservation" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "inventoryItemId" TEXT,
  "detectedLabel" TEXT NOT NULL,
  "proposedName" TEXT,
  "canonicalSlug" TEXT,
  "detectorModel" TEXT,
  "classifierModel" TEXT,
  "modelName" TEXT,
  "confidence" DOUBLE PRECISION,
  "imageRef" TEXT,
  "cropRef" TEXT,
  "bbox" JSONB,
  "rawPayload" JSONB,
  "action" "VisionObservationAction" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VisionObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisionObservation_userId_createdAt_idx" ON "VisionObservation"("userId", "createdAt");
CREATE INDEX "VisionObservation_inventoryItemId_idx" ON "VisionObservation"("inventoryItemId");
CREATE INDEX "VisionObservation_detectedLabel_idx" ON "VisionObservation"("detectedLabel");
CREATE INDEX "VisionObservation_canonicalSlug_idx" ON "VisionObservation"("canonicalSlug");
CREATE INDEX "VisionObservation_action_createdAt_idx" ON "VisionObservation"("action", "createdAt");

ALTER TABLE "VisionObservation"
  ADD CONSTRAINT "VisionObservation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VisionObservation"
  ADD CONSTRAINT "VisionObservation_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "KitchenInventoryItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
