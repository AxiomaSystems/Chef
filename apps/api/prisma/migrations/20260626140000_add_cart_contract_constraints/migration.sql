SET LOCAL lock_timeout = '5s';

ALTER TABLE "CartDraft"
  ADD CONSTRAINT "CartDraft_name_max_length_chk"
  CHECK ("name" IS NULL OR length("name") <= 140) NOT VALID,
  ADD CONSTRAINT "CartDraft_selections_max_items_chk"
  CHECK (jsonb_array_length("selections") <= 50) NOT VALID;

ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_name_max_length_chk"
  CHECK ("name" IS NULL OR length("name") <= 140) NOT VALID,
  ADD CONSTRAINT "Cart_selections_max_items_chk"
  CHECK (jsonb_array_length("selections") <= 50) NOT VALID,
  ADD CONSTRAINT "Cart_dishes_max_items_chk"
  CHECK (jsonb_array_length("dishes") <= 50) NOT VALID;

ALTER TABLE "ShoppingCart"
  ADD CONSTRAINT "ShoppingCart_name_max_length_chk"
  CHECK ("name" IS NULL OR length("name") <= 140) NOT VALID,
  ADD CONSTRAINT "ShoppingCart_inventoryAppliedAt_after_checkedOutAt_chk"
  CHECK (
    "inventoryAppliedAt" IS NULL
    OR "checkedOutAt" IS NULL
    OR "inventoryAppliedAt" >= "checkedOutAt"
  ) NOT VALID;

ALTER TABLE "CartDraft" VALIDATE CONSTRAINT "CartDraft_name_max_length_chk";
ALTER TABLE "CartDraft" VALIDATE CONSTRAINT "CartDraft_selections_max_items_chk";

ALTER TABLE "Cart" VALIDATE CONSTRAINT "Cart_name_max_length_chk";
ALTER TABLE "Cart" VALIDATE CONSTRAINT "Cart_selections_max_items_chk";
ALTER TABLE "Cart" VALIDATE CONSTRAINT "Cart_dishes_max_items_chk";

ALTER TABLE "ShoppingCart" VALIDATE CONSTRAINT "ShoppingCart_name_max_length_chk";
ALTER TABLE "ShoppingCart" VALIDATE CONSTRAINT "ShoppingCart_inventoryAppliedAt_after_checkedOutAt_chk";
