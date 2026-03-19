-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "selections" JSONB NOT NULL,
    "dishes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- Backfill one Cart snapshot per existing GeneratedCart row.
INSERT INTO "Cart" (
    "id",
    "userId",
    "name",
    "selections",
    "dishes",
    "createdAt",
    "updatedAt"
)
SELECT
    'cart_' || gc."id",
    gc."userId",
    cd."name",
    COALESCE(cd."selections", '[]'::jsonb),
    gc."dishes",
    gc."createdAt",
    gc."updatedAt"
FROM "GeneratedCart" gc
LEFT JOIN "CartDraft" cd ON cd."id" = gc."cartDraftId";

-- Rename GeneratedCart to ShoppingCart and preserve data.
ALTER TABLE "GeneratedCart" RENAME TO "ShoppingCart";
ALTER TABLE "ShoppingCart" RENAME CONSTRAINT "GeneratedCart_pkey" TO "ShoppingCart_pkey";
ALTER INDEX "GeneratedCart_userId_createdAt_idx" RENAME TO "ShoppingCart_userId_createdAt_idx";
ALTER INDEX "GeneratedCart_cartDraftId_idx" RENAME TO "ShoppingCart_cartDraftId_idx";
ALTER TABLE "ShoppingCart" RENAME CONSTRAINT "GeneratedCart_userId_fkey" TO "ShoppingCart_userId_fkey";
ALTER TABLE "ShoppingCart" RENAME CONSTRAINT "GeneratedCart_cartDraftId_fkey" TO "ShoppingCart_cartDraftId_fkey";

-- Add the new Cart relationship for ShoppingCart.
ALTER TABLE "ShoppingCart" ADD COLUMN "cartId" TEXT;
UPDATE "ShoppingCart"
SET "cartId" = 'cart_' || "id";
ALTER TABLE "ShoppingCart" ALTER COLUMN "cartId" SET NOT NULL;

-- Cart now owns dishes; ShoppingCart keeps only retailer-facing purchase data.
ALTER TABLE "ShoppingCart" DROP COLUMN "dishes";

-- CreateIndex
CREATE INDEX "Cart_userId_createdAt_idx" ON "Cart"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShoppingCart_cartId_idx" ON "ShoppingCart"("cartId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingCart" ADD CONSTRAINT "ShoppingCart_cartId_fkey"
FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
