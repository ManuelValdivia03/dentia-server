-- Adds auth security fields expected by auth-service in production.
-- Run this against the dentia_auth database.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "emailVerificationLockedUntil" timestamptz,
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loginLockedUntil" timestamptz,
  ADD COLUMN IF NOT EXISTS "passwordResetCodeHash" varchar(255),
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "passwordResetAttempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "passwordResetLastSentAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "passwordResetLockedUntil" timestamptz;

