-- Roll-forward reconciliation for the active cart lifecycle.
-- Supabase had an incomplete ShoppingCart lifecycle migration applied outside
-- the repo; this migration makes the intended contract explicit and safe for
-- both existing Supabase databases and fresh local databases.

DO $$
BEGIN
  CREATE TYPE "CartStatus" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ShoppingCartStatus" AS ENUM ('active', 'checked_out', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Cart"
ADD COLUMN IF NOT EXISTS "status" "CartStatus" NOT NULL DEFAULT 'active';

WITH ranked_active_carts AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rank
  FROM "Cart"
  WHERE "status" = 'active'
)
UPDATE "Cart"
SET "status" = 'archived'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_carts
  WHERE rank > 1
);

CREATE INDEX IF NOT EXISTS "Cart_userId_status_updatedAt_idx"
ON "Cart"("userId", "status", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_one_active_per_user_idx"
ON "Cart"("userId")
WHERE "status" = 'active';

ALTER TABLE "ShoppingCart"
ADD COLUMN IF NOT EXISTS "name" TEXT;

ALTER TABLE "ShoppingCart"
ADD COLUMN IF NOT EXISTS "status" "ShoppingCartStatus" NOT NULL DEFAULT 'archived';

ALTER TABLE "ShoppingCart"
ADD COLUMN IF NOT EXISTS "inventoryAppliedAt" TIMESTAMP(3);

WITH ranked_active_shopping_carts AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rank
  FROM "ShoppingCart"
  WHERE "status" = 'active'
)
UPDATE "ShoppingCart"
SET "status" = 'archived'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_shopping_carts
  WHERE rank > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "ShoppingCart"
    WHERE "cartId" IS NULL
  ) THEN
    ALTER TABLE "ShoppingCart" ALTER COLUMN "cartId" SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ShoppingCart_userId_status_updatedAt_idx"
ON "ShoppingCart"("userId", "status", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ShoppingCart_one_active_per_user_idx"
ON "ShoppingCart"("userId")
WHERE "status" = 'active';
