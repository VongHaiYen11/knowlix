CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS user_ai_customizations (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  ingest_model TEXT NOT NULL DEFAULT '',
  research_model TEXT NOT NULL DEFAULT '',
  ingest_reasoning TEXT NOT NULL DEFAULT 'auto' CHECK (ingest_reasoning IN ('auto', 'low', 'balanced', 'high')),
  research_reasoning TEXT NOT NULL DEFAULT 'auto' CHECK (research_reasoning IN ('auto', 'low', 'balanced', 'high')),
  ingest_temperature NUMERIC(3,2) CHECK (ingest_temperature IS NULL OR (ingest_temperature >= 0 AND ingest_temperature <= 1)),
  research_temperature NUMERIC(3,2) CHECK (research_temperature IS NULL OR (research_temperature >= 0 AND research_temperature <= 1)),
  knowledge_definition TEXT NOT NULL DEFAULT '',
  knowledge_extraction_instructions TEXT NOT NULL DEFAULT '',
  research_answer_instructions TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  raw_path TEXT,
  storage_object_id TEXT,
  ingest_status TEXT NOT NULL DEFAULT 'pending' CHECK (ingest_status IN ('pending', 'completed', 'skipped', 'failed')),
  ingest_outputs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('raw_source', 'extracted_text', 'source_summary', 'knowledge_markdown', 'knowledge_revision', 'note_markdown', 'other')),
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  checksum TEXT NOT NULL DEFAULT '',
  original_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'DOCX', 'TXT', 'Markdown')),
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Queued', 'Processing', 'Processed')),
  meta TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  file_id TEXT REFERENCES uploaded_files(id) ON DELETE SET NULL,
  raw_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  extracted_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  summary_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  knowledge_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_user_updated_idx ON sources (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sources_tags_idx ON sources USING gin (tags);
CREATE INDEX IF NOT EXISTS sources_knowledge_tags_idx ON sources USING gin (knowledge_tags);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  slug TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  overview TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  read_time TEXT NOT NULL DEFAULT '1 min read',
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  key_ideas JSONB NOT NULL DEFAULT '[]',
  explanation JSONB NOT NULL DEFAULT '[]',
  examples JSONB NOT NULL DEFAULT '[]',
  related JSONB NOT NULL DEFAULT '[]',
  reference_list JSONB NOT NULL DEFAULT '[]',
  source_list JSONB NOT NULL DEFAULT '[]',
  timeline JSONB NOT NULL DEFAULT '[]',
  markdown_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  knowledge_tags TEXT[] NOT NULL DEFAULT '{}',
  search_vector TSVECTOR,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX IF NOT EXISTS knowledge_user_updated_idx ON knowledge_entries (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_tags_idx ON knowledge_entries USING gin (tags);
CREATE INDEX IF NOT EXISTS knowledge_knowledge_tags_idx ON knowledge_entries USING gin (knowledge_tags);
CREATE INDEX IF NOT EXISTS knowledge_search_vector_idx ON knowledge_entries USING gin (search_vector);
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge_entries USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS knowledge_revisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON DELETE RESTRICT,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('create', 'update', 'merge', 'replace', 'proposal', 'manual_import')),
  model TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_revisions_user_slug_idx ON knowledge_revisions (user_id, slug, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_source_links (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'supports',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug, source_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL,
  words INTEGER NOT NULL DEFAULT 0 CHECK (words >= 0),
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_updated_idx ON notes (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_time TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx ON journal_entries (user_id, entry_date DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS journal_entries_tags_idx ON journal_entries USING gin (tags);

CREATE TABLE IF NOT EXISTS research_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  scope JSONB NOT NULL DEFAULT '{"tags":[],"categories":[],"dateRange":"Anytime"}',
  title_manually_edited BOOLEAN NOT NULL DEFAULT false,
  summary_markdown TEXT NOT NULL DEFAULT '',
  summary_generated_at TIMESTAMPTZ,
  summary_model TEXT NOT NULL DEFAULT '',
  summary_message_count INTEGER NOT NULL DEFAULT 0 CHECK (summary_message_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE INDEX IF NOT EXISTS research_threads_user_updated_idx ON research_threads (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS research_messages (
  thread_id TEXT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  reference_list JSONB NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, id)
);

CREATE INDEX IF NOT EXISTS research_messages_thread_position_idx ON research_messages (thread_id, position);

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
