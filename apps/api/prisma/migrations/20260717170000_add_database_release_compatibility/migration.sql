CREATE TABLE "DatabaseReleaseCompatibility" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "minimumApiMigration" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DatabaseReleaseCompatibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DatabaseReleaseCompatibility_singleton" CHECK ("id" = 1)
);

INSERT INTO "DatabaseReleaseCompatibility" ("id", "minimumApiMigration")
VALUES (1, '20260628120000_add_recipe_execution_metadata');
