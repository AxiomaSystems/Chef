ALTER TABLE "ShoppingCart" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "ShoppingCart" ADD COLUMN IF NOT EXISTS "externalReferenceId" TEXT;
