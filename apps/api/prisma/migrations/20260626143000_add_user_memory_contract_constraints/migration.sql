SET LOCAL lock_timeout = '5s';

ALTER TABLE "Tag"
  ADD CONSTRAINT "Tag_id_scope_key" UNIQUE ("id", "scope");

ALTER TABLE "UserPreferredTag"
  ADD COLUMN "tagScope" "TagScope" NOT NULL DEFAULT 'system';

ALTER TABLE "UserPreferredTag"
  ADD CONSTRAINT "UserPreferredTag_tag_scope_system_chk"
  CHECK ("tagScope" = 'system') NOT VALID;

ALTER TABLE "UserPreferredTag"
  ADD CONSTRAINT "UserPreferredTag_tagId_tagScope_fkey"
  FOREIGN KEY ("tagId", "tagScope")
  REFERENCES "Tag"("id", "scope")
  ON UPDATE CASCADE
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE "UserFoodRule"
  ADD CONSTRAINT "UserFoodRule_label_not_blank_chk"
  CHECK (btrim("label") <> '') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_label_max_length_chk"
  CHECK (length("label") <= 120) NOT VALID,
  ADD CONSTRAINT "UserFoodRule_normalizedLabel_not_blank_chk"
  CHECK (btrim("normalizedLabel") <> '') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_normalizedLabel_max_length_chk"
  CHECK (length("normalizedLabel") <= 120) NOT VALID,
  ADD CONSTRAINT "UserFoodRule_dedupeKey_not_blank_chk"
  CHECK (btrim("dedupeKey") <> '') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_dedupeKey_max_length_chk"
  CHECK (length("dedupeKey") <= 240) NOT VALID,
  ADD CONSTRAINT "UserFoodRule_notes_max_length_chk"
  CHECK ("notes" IS NULL OR length("notes") <= 500) NOT VALID,
  ADD CONSTRAINT "UserFoodRule_one_catalog_reference_chk"
  CHECK ("ingredientId" IS NULL OR "tagId" IS NULL) NOT VALID,
  ADD CONSTRAINT "UserFoodRule_temporal_range_chk"
  CHECK ("startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt") NOT VALID,
  ADD CONSTRAINT "UserFoodRule_behavior_low_confidence_chk"
  CHECK ("source" <> 'behavior' OR "confidence" = 'low') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_inferred_not_high_confidence_chk"
  CHECK ("source" <> 'inferred' OR "confidence" <> 'high') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_inferred_behavior_soft_only_chk"
  CHECK ("source" NOT IN ('inferred', 'behavior') OR "strictness" <> 'hard') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_inferred_behavior_no_require_chk"
  CHECK ("source" NOT IN ('inferred', 'behavior') OR "action" <> 'require') NOT VALID,
  ADD CONSTRAINT "UserFoodRule_inferred_behavior_no_dietary_constraint_chk"
  CHECK ("source" NOT IN ('inferred', 'behavior') OR "kind" <> 'dietary_constraint') NOT VALID;

ALTER TABLE "UserGoal"
  ADD CONSTRAINT "UserGoal_temporal_range_chk"
  CHECK ("startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt") NOT VALID,
  ADD CONSTRAINT "UserGoal_behavior_low_confidence_chk"
  CHECK ("source" <> 'behavior' OR "confidence" = 'low') NOT VALID;

ALTER TABLE "UserPreferredTag" VALIDATE CONSTRAINT "UserPreferredTag_tag_scope_system_chk";
ALTER TABLE "UserPreferredTag" VALIDATE CONSTRAINT "UserPreferredTag_tagId_tagScope_fkey";

ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_label_not_blank_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_label_max_length_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_normalizedLabel_not_blank_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_normalizedLabel_max_length_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_dedupeKey_not_blank_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_dedupeKey_max_length_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_notes_max_length_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_one_catalog_reference_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_temporal_range_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_behavior_low_confidence_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_inferred_not_high_confidence_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_inferred_behavior_soft_only_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_inferred_behavior_no_require_chk";
ALTER TABLE "UserFoodRule" VALIDATE CONSTRAINT "UserFoodRule_inferred_behavior_no_dietary_constraint_chk";

ALTER TABLE "UserGoal" VALIDATE CONSTRAINT "UserGoal_temporal_range_chk";
ALTER TABLE "UserGoal" VALIDATE CONSTRAINT "UserGoal_behavior_low_confidence_chk";
