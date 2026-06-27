-- Retailer is a closed shared contract: walmart, kroger, or instacart.
-- These constraints were applied and validated in Supabase first with short
-- lock timeouts, then recorded idempotently here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CartDraft_retailer_allowed_chk') THEN
    ALTER TABLE "CartDraft"
    ADD CONSTRAINT "CartDraft_retailer_allowed_chk"
    CHECK ("retailer" IN ('walmart', 'kroger', 'instacart'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cart_retailer_allowed_chk') THEN
    ALTER TABLE "Cart"
    ADD CONSTRAINT "Cart_retailer_allowed_chk"
    CHECK ("retailer" IN ('walmart', 'kroger', 'instacart'))
    NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingCart_retailer_allowed_chk') THEN
    ALTER TABLE "ShoppingCart"
    ADD CONSTRAINT "ShoppingCart_retailer_allowed_chk"
    CHECK ("retailer" IN ('walmart', 'kroger', 'instacart'))
    NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('CartDraft', 'CartDraft_retailer_allowed_chk'),
      ('Cart', 'Cart_retailer_allowed_chk'),
      ('ShoppingCart', 'ShoppingCart_retailer_allowed_chk')
    ) AS constraints(table_name, constraint_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = target.constraint_name
        AND convalidated IS FALSE
    ) THEN
      EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', target.table_name, target.constraint_name);
    END IF;
  END LOOP;
END $$;
