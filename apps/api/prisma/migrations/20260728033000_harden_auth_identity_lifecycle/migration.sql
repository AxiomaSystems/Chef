-- CreateEnum
CREATE TYPE "AuthActionTokenType" AS ENUM ('email_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "AuthSecurityEventType" AS ENUM (
  'email_verified',
  'password_reset',
  'identity_linked',
  'identity_unlinked',
  'password_added',
  'password_removed'
);

-- CreateTable
CREATE TABLE "AuthActionToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AuthActionTokenType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AuthSecurityEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- Revoke legacy refresh sessions for password identities whose email ownership
-- was never verified. Existing access tokens expire on their normal short TTL.
UPDATE "RefreshToken" AS refresh_token
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE refresh_token."revokedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "AuthIdentity" AS identity
    WHERE identity."userId" = refresh_token."userId"
      AND identity."provider" = 'password'
      AND identity."emailVerified" = false
  );

-- Enforce one identity per provider per user. The migration fails rather than
-- silently choosing between duplicate identities if historical drift exists.
DROP INDEX IF EXISTS "AuthIdentity_userId_provider_idx";
CREATE UNIQUE INDEX "AuthIdentity_userId_provider_key"
ON "AuthIdentity"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AuthActionToken_tokenHash_key" ON "AuthActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthActionToken_userId_type_createdAt_idx"
ON "AuthActionToken"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuthActionToken_expiresAt_idx" ON "AuthActionToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthSecurityEvent_userId_createdAt_idx"
ON "AuthSecurityEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthActionToken"
ADD CONSTRAINT "AuthActionToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSecurityEvent"
ADD CONSTRAINT "AuthSecurityEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
