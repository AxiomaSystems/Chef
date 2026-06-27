SET LOCAL lock_timeout = '5s';

ALTER TABLE "Cuisine"
  ADD CONSTRAINT "Cuisine_slug_not_blank_chk"
  CHECK (btrim("slug") <> '') NOT VALID,
  ADD CONSTRAINT "Cuisine_slug_format_chk"
  CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') NOT VALID,
  ADD CONSTRAINT "Cuisine_slug_max_length_chk"
  CHECK (length("slug") <= 80) NOT VALID,
  ADD CONSTRAINT "Cuisine_label_not_blank_chk"
  CHECK (btrim("label") <> '') NOT VALID,
  ADD CONSTRAINT "Cuisine_label_max_length_chk"
  CHECK (length("label") <= 120) NOT VALID;

ALTER TABLE "Tag"
  ADD CONSTRAINT "Tag_slug_not_blank_chk"
  CHECK (btrim("slug") <> '') NOT VALID,
  ADD CONSTRAINT "Tag_slug_format_chk"
  CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') NOT VALID,
  ADD CONSTRAINT "Tag_slug_max_length_chk"
  CHECK (length("slug") <= 80) NOT VALID,
  ADD CONSTRAINT "Tag_name_not_blank_chk"
  CHECK (btrim("name") <> '') NOT VALID,
  ADD CONSTRAINT "Tag_name_max_length_chk"
  CHECK (length("name") <= 120) NOT VALID,
  ADD CONSTRAINT "Tag_scope_owner_consistency_chk"
  CHECK (
    ("scope" = 'system' AND "ownerUserId" IS NULL)
    OR ("scope" = 'user' AND "ownerUserId" IS NOT NULL)
  ) NOT VALID;

ALTER TABLE "Ingredient"
  ADD CONSTRAINT "Ingredient_slug_not_blank_chk"
  CHECK (btrim("slug") <> '') NOT VALID,
  ADD CONSTRAINT "Ingredient_slug_format_chk"
  CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') NOT VALID,
  ADD CONSTRAINT "Ingredient_slug_max_length_chk"
  CHECK (length("slug") <= 120) NOT VALID,
  ADD CONSTRAINT "Ingredient_canonicalName_not_blank_chk"
  CHECK (btrim("canonicalName") <> '') NOT VALID,
  ADD CONSTRAINT "Ingredient_canonicalName_max_length_chk"
  CHECK (length("canonicalName") <= 120) NOT VALID,
  ADD CONSTRAINT "Ingredient_category_max_length_chk"
  CHECK ("category" IS NULL OR length("category") <= 80) NOT VALID,
  ADD CONSTRAINT "Ingredient_defaultUnit_max_length_chk"
  CHECK ("defaultUnit" IS NULL OR length("defaultUnit") <= 32) NOT VALID;

ALTER TABLE "Cuisine" VALIDATE CONSTRAINT "Cuisine_slug_not_blank_chk";
ALTER TABLE "Cuisine" VALIDATE CONSTRAINT "Cuisine_slug_format_chk";
ALTER TABLE "Cuisine" VALIDATE CONSTRAINT "Cuisine_slug_max_length_chk";
ALTER TABLE "Cuisine" VALIDATE CONSTRAINT "Cuisine_label_not_blank_chk";
ALTER TABLE "Cuisine" VALIDATE CONSTRAINT "Cuisine_label_max_length_chk";

ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_slug_not_blank_chk";
ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_slug_format_chk";
ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_slug_max_length_chk";
ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_name_not_blank_chk";
ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_name_max_length_chk";
ALTER TABLE "Tag" VALIDATE CONSTRAINT "Tag_scope_owner_consistency_chk";

ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_slug_not_blank_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_slug_format_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_slug_max_length_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_canonicalName_not_blank_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_canonicalName_max_length_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_category_max_length_chk";
ALTER TABLE "Ingredient" VALIDATE CONSTRAINT "Ingredient_defaultUnit_max_length_chk";
