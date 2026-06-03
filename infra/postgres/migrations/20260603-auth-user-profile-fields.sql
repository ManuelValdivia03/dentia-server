-- Adds the profile fields expected by auth-service in production.
-- Run this against the dentia_auth database.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "specialty" varchar(120),
  ADD COLUMN IF NOT EXISTS "cedulaProfesional" varchar(60),
  ADD COLUMN IF NOT EXISTS "escuela" varchar(160),
  ADD COLUMN IF NOT EXISTS "descripcion" text,
  ADD COLUMN IF NOT EXISTS "profilePhoto" bytea,
  ADD COLUMN IF NOT EXISTS "profilePhotoContentType" varchar(100);

