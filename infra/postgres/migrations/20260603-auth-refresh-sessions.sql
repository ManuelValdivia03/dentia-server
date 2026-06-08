CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "refresh_sessions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" varchar NOT NULL,
  "tokenHash" varchar(64) NOT NULL,
  "lastActivityAt" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_refresh_sessions_userId"
  ON "refresh_sessions" ("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_refresh_sessions_tokenHash"
  ON "refresh_sessions" ("tokenHash");
