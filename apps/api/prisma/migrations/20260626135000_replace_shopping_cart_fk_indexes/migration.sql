-- Replace simple ShoppingCart foreign-key indexes with composite indexes that
-- also support the owner-consistency composite foreign keys.
SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS "ShoppingCart_cartId_userId_idx"
  ON "ShoppingCart" ("cartId", "userId");

CREATE INDEX IF NOT EXISTS "ShoppingCart_cartDraftId_userId_idx"
  ON "ShoppingCart" ("cartDraftId", "userId");

DROP INDEX IF EXISTS "ShoppingCart_cartId_idx";
DROP INDEX IF EXISTS "ShoppingCart_cartDraftId_idx";
