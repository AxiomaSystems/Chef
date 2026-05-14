CREATE TYPE "CaptureInputKind" AS ENUM ('url', 'text');
CREATE TYPE "CaptureSourceKind" AS ENUM (
  'recipe_url',
  'social_url',
  'pasted_text',
  'unknown'
);
CREATE TYPE "CaptureResultKind" AS ENUM (
  'exact_recipe_import',
  'partial_recipe_import',
  'reconstructed_recipe',
  'inspired_recipe'
);
CREATE TYPE "CaptureStatus" AS ENUM (
  'processing',
  'ready_for_review',
  'needs_more_info',
  'failed',
  'saved',
  'discarded'
);
CREATE TYPE "CaptureConfidence" AS ENUM ('low', 'medium', 'high');

CREATE TABLE "Capture" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inputKind" "CaptureInputKind" NOT NULL,
  "sourceKind" "CaptureSourceKind" NOT NULL,
  "resultKind" "CaptureResultKind" NOT NULL,
  "status" "CaptureStatus" NOT NULL DEFAULT 'ready_for_review',
  "confidence" "CaptureConfidence" NOT NULL DEFAULT 'medium',
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "sourceUrl" TEXT,
  "sourceTextSnippet" TEXT,
  "attribution" JSONB NOT NULL,
  "recipePreview" JSONB,
  "assumptions" JSONB NOT NULL,
  "missingInfo" JSONB NOT NULL,
  "nextActions" JSONB NOT NULL,
  "extractionNotes" JSONB NOT NULL,
  "shortSnippets" JSONB NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Capture_userId_createdAt_idx" ON "Capture"("userId", "createdAt");
CREATE INDEX "Capture_userId_status_createdAt_idx" ON "Capture"("userId", "status", "createdAt");
CREATE INDEX "Capture_sourceKind_createdAt_idx" ON "Capture"("sourceKind", "createdAt");

ALTER TABLE "Capture"
  ADD CONSTRAINT "Capture_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
