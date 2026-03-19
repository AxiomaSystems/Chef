CREATE TYPE "CuisineKind" AS ENUM ('national', 'regional', 'cultural', 'style', 'other');

CREATE TABLE "Cuisine" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "CuisineKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuisine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cuisine_slug_key" ON "Cuisine"("slug");
CREATE INDEX "Cuisine_kind_label_idx" ON "Cuisine"("kind", "label");

INSERT INTO "Cuisine" ("id", "slug", "label", "kind")
VALUES
    ('cuisine-peruvian', 'peruvian', 'Peruvian', 'national'),
    ('cuisine-mexican', 'mexican', 'Mexican', 'national'),
    ('cuisine-italian', 'italian', 'Italian', 'national'),
    ('cuisine-middle-eastern', 'middle-eastern', 'Middle Eastern', 'cultural'),
    ('cuisine-mediterranean', 'mediterranean', 'Mediterranean', 'style'),
    ('cuisine-tex-mex', 'tex-mex', 'Tex-Mex', 'style'),
    ('cuisine-other', 'other', 'Other', 'other');

ALTER TABLE "BaseRecipe" ADD COLUMN "cuisineId" TEXT;

UPDATE "BaseRecipe"
SET "cuisineId" = CASE
    WHEN "cuisine" IS NULL OR BTRIM("cuisine") = '' THEN 'cuisine-other'
    WHEN LOWER(BTRIM("cuisine")) = 'peruvian' THEN 'cuisine-peruvian'
    WHEN LOWER(BTRIM("cuisine")) = 'mexican' THEN 'cuisine-mexican'
    WHEN LOWER(BTRIM("cuisine")) = 'italian' THEN 'cuisine-italian'
    WHEN LOWER(BTRIM("cuisine")) = 'middle eastern' THEN 'cuisine-middle-eastern'
    WHEN LOWER(BTRIM("cuisine")) = 'mediterranean' THEN 'cuisine-mediterranean'
    WHEN LOWER(BTRIM("cuisine")) = 'tex-mex' THEN 'cuisine-tex-mex'
    ELSE 'cuisine-other'
END;

ALTER TABLE "BaseRecipe" ALTER COLUMN "cuisineId" SET NOT NULL;
ALTER TABLE "BaseRecipe" ADD CONSTRAINT "BaseRecipe_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BaseRecipe_cuisineId_idx" ON "BaseRecipe"("cuisineId");

ALTER TABLE "BaseRecipe" DROP COLUMN "cuisine";
