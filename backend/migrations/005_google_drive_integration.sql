CREATE TABLE IF NOT EXISTS google_drive_connections (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  google_account_email TEXT NOT NULL DEFAULT '',
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  folder_id TEXT,
  folder_name TEXT,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'syncing', 'error', 'reauthorization_required')),
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sync_lease_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_drive_connections_due_idx
  ON google_drive_connections (next_sync_at)
  WHERE folder_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS google_drive_files (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  modified_time TIMESTAMPTZ,
  processed_modified_time TIMESTAMPTZ,
  drive_version TEXT NOT NULL DEFAULT '',
  processed_version TEXT NOT NULL DEFAULT '',
  checksum TEXT NOT NULL DEFAULT '',
  processed_checksum TEXT NOT NULL DEFAULT '',
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'unsupported', 'failed', 'removed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  processing_lease_until TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS google_drive_files_pending_idx
  ON google_drive_files (next_attempt_at, updated_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS google_drive_files_source_idx
  ON google_drive_files (user_id, source_id);

CREATE TABLE IF NOT EXISTS google_drive_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_drive_oauth_states_expires_idx
  ON google_drive_oauth_states (expires_at);
