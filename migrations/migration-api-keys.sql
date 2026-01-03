-- Migration: create api_keys table for API key authentication
-- Note: run this against your Neon Postgres database before enabling API key logic in routes.

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id integer NOT NULL REFERENCES users(id),
  organization_id integer REFERENCES organizations(id),
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('read', 'read_write')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  rate_limit_bucket text
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
