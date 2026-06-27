-- ShoppingCart stores userId alongside cartId/cartDraftId for query speed.
-- These composite FKs prevent denormalized ownership drift.
--
-- Applied and validated in Supabase first with short lock timeouts, then
-- recorded idempotently here.

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_id_userId_key"
ON "Cart"("id", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "CartDraft_id_userId_key"
ON "CartDraft"("id", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingCart_cart_user_owner_fkey'
  ) THEN
    ALTER TABLE "ShoppingCart"
    ADD CONSTRAINT "ShoppingCart_cart_user_owner_fkey"
    FOREIGN KEY ("cartId", "userId")
    REFERENCES "Cart"("id", "userId")
    ON DELETE CASCADE
    ON UPDATE CASCADE
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingCart_cartDraft_user_owner_fkey'
  ) THEN
    ALTER TABLE "ShoppingCart"
    ADD CONSTRAINT "ShoppingCart_cartDraft_user_owner_fkey"
    FOREIGN KEY ("cartDraftId", "userId")
    REFERENCES "CartDraft"("id", "userId")
    ON DELETE SET NULL
    ON UPDATE CASCADE
    NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY[
    'ShoppingCart_cart_user_owner_fkey',
    'ShoppingCart_cartDraft_user_owner_fkey'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND convalidated IS FALSE
    ) THEN
      EXECUTE format('ALTER TABLE "ShoppingCart" VALIDATE CONSTRAINT %I', constraint_name);
    END IF;
  END LOOP;
END $$;
