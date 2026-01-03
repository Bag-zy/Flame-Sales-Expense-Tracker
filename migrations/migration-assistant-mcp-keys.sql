CREATE TABLE IF NOT EXISTS assistant_mcp_keys (
  user_id integer PRIMARY KEY REFERENCES users(id),
  api_key_id uuid REFERENCES api_keys(id),
  encrypted_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assistant_mcp_keys_api_key_id ON assistant_mcp_keys(api_key_id);
