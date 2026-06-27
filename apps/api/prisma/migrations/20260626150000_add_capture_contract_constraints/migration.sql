SET LOCAL lock_timeout = '5s';

ALTER TABLE "Capture"
  ADD CONSTRAINT "Capture_sourceUrl_max_length_chk"
  CHECK ("sourceUrl" IS NULL OR length("sourceUrl") <= 2048) NOT VALID,
  ADD CONSTRAINT "Capture_sourceUrl_http_protocol_chk"
  CHECK ("sourceUrl" IS NULL OR "sourceUrl" ~ '^https?://') NOT VALID,
  ADD CONSTRAINT "Capture_sourceTextSnippet_max_length_chk"
  CHECK ("sourceTextSnippet" IS NULL OR length("sourceTextSnippet") <= 1000) NOT VALID,
  ADD CONSTRAINT "Capture_errorMessage_max_length_chk"
  CHECK ("errorMessage" IS NULL OR length("errorMessage") <= 1000) NOT VALID;

ALTER TABLE "Capture" VALIDATE CONSTRAINT "Capture_sourceUrl_max_length_chk";
ALTER TABLE "Capture" VALIDATE CONSTRAINT "Capture_sourceUrl_http_protocol_chk";
ALTER TABLE "Capture" VALIDATE CONSTRAINT "Capture_sourceTextSnippet_max_length_chk";
ALTER TABLE "Capture" VALIDATE CONSTRAINT "Capture_errorMessage_max_length_chk";
