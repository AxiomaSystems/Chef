CREATE TABLE "DatabaseReleaseCompatibility" (
    "id" INTEGER NOT NULL,
    "minimumApiMigration" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseReleaseCompatibility_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DatabaseReleaseCompatibility_singleton" CHECK ("id" = 1)
);

INSERT INTO "DatabaseReleaseCompatibility" (
    "id",
    "minimumApiMigration",
    "updatedAt"
) VALUES (
    1,
    '20260628120000_add_recipe_execution_metadata',
    CURRENT_TIMESTAMP
);
