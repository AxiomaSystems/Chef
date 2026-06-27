SET LOCAL lock_timeout = '5s';

ALTER TABLE "KitchenInventoryItem"
  ADD CONSTRAINT "KitchenInventoryItem_displayName_not_blank_chk"
  CHECK (btrim("displayName") <> '') NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_displayName_max_length_chk"
  CHECK (length("displayName") <= 120) NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_normalizedName_not_blank_chk"
  CHECK (btrim("normalizedName") <> '') NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_normalizedName_max_length_chk"
  CHECK (length("normalizedName") <= 120) NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_label_max_length_chk"
  CHECK ("label" IS NULL OR length("label") <= 120) NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_estimatedAmount_range_chk"
  CHECK ("estimatedAmount" IS NULL OR ("estimatedAmount" >= 0 AND "estimatedAmount" <= 10000)) NOT VALID,
  ADD CONSTRAINT "KitchenInventoryItem_unit_max_length_chk"
  CHECK ("unit" IS NULL OR length("unit") <= 24) NOT VALID;

ALTER TABLE "VisionObservation"
  ADD CONSTRAINT "VisionObservation_detectedLabel_not_blank_chk"
  CHECK (btrim("detectedLabel") <> '') NOT VALID,
  ADD CONSTRAINT "VisionObservation_canonicalSlug_format_chk"
  CHECK (
    "canonicalSlug" IS NULL
    OR "canonicalSlug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) NOT VALID;

ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_displayName_not_blank_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_displayName_max_length_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_normalizedName_not_blank_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_normalizedName_max_length_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_label_max_length_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_estimatedAmount_range_chk";
ALTER TABLE "KitchenInventoryItem" VALIDATE CONSTRAINT "KitchenInventoryItem_unit_max_length_chk";

ALTER TABLE "VisionObservation" VALIDATE CONSTRAINT "VisionObservation_detectedLabel_not_blank_chk";
ALTER TABLE "VisionObservation" VALIDATE CONSTRAINT "VisionObservation_canonicalSlug_format_chk";
