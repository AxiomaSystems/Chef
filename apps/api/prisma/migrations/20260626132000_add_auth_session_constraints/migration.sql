-- Auth/session invariants already expected by the application. These were
-- audited, applied, and validated in Supabase first with short lock timeouts,
-- then recorded idempotently here.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuthIdentity_provider_passwordHash_chk'
  ) THEN
    ALTER TABLE "AuthIdentity"
    ADD CONSTRAINT "AuthIdentity_provider_passwordHash_chk"
    CHECK (
      ("provider" = 'password' AND "passwordHash" IS NOT NULL AND length("passwordHash") > 0)
      OR ("provider" <> 'password' AND "passwordHash" IS NULL)
    )
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_expiresAt_after_createdAt_chk'
  ) THEN
    ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_expiresAt_after_createdAt_chk"
    CHECK ("expiresAt" > "createdAt")
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_revokedAt_after_createdAt_chk'
  ) THEN
    ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_revokedAt_after_createdAt_chk"
    CHECK ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_replacedByTokenId_not_self_chk'
  ) THEN
    ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_replacedByTokenId_not_self_chk"
    CHECK ("replacedByTokenId" IS NULL OR "replacedByTokenId" <> "id")
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_replacedByTokenId_fkey'
  ) THEN
    ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey"
    FOREIGN KEY ("replacedByTokenId")
    REFERENCES "RefreshToken"("id")
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
    'AuthIdentity_provider_passwordHash_chk',
    'RefreshToken_expiresAt_after_createdAt_chk',
    'RefreshToken_revokedAt_after_createdAt_chk',
    'RefreshToken_replacedByTokenId_not_self_chk',
    'RefreshToken_replacedByTokenId_fkey'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND convalidated IS FALSE
    ) THEN
      IF constraint_name = 'AuthIdentity_provider_passwordHash_chk' THEN
        ALTER TABLE "AuthIdentity" VALIDATE CONSTRAINT "AuthIdentity_provider_passwordHash_chk";
      ELSE
        EXECUTE format('ALTER TABLE "RefreshToken" VALIDATE CONSTRAINT %I', constraint_name);
      END IF;
    END IF;
  END LOOP;
END $$;
