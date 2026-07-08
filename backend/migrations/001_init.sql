CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  type TEXT NOT NULL CHECK (type IN ('Note', 'PDF', 'Article', 'Bookmark', 'Image', 'Voice', 'File')),
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
  workspace_labels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_user_updated_idx ON sources (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sources_tags_idx ON sources USING gin (tags);
CREATE INDEX IF NOT EXISTS sources_knowledge_tags_idx ON sources USING gin (knowledge_tags);
CREATE INDEX IF NOT EXISTS sources_workspace_labels_idx ON sources USING gin (workspace_labels);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  slug TEXT PRIMARY KEY,
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
  workspace_labels TEXT[] NOT NULL DEFAULT '{}',
  search_vector TSVECTOR,
  embedding JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS knowledge_user_updated_idx ON knowledge_entries (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_tags_idx ON knowledge_entries USING gin (tags);
CREATE INDEX IF NOT EXISTS knowledge_knowledge_tags_idx ON knowledge_entries USING gin (knowledge_tags);
CREATE INDEX IF NOT EXISTS knowledge_workspace_labels_idx ON knowledge_entries USING gin (workspace_labels);
CREATE INDEX IF NOT EXISTS knowledge_search_vector_idx ON knowledge_entries USING gin (search_vector);

CREATE TABLE IF NOT EXISTS knowledge_revisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON DELETE RESTRICT,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('create', 'update', 'merge', 'proposal', 'manual_import')),
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

CREATE TABLE IF NOT EXISTS journal_days (
  date TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  weekday TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  entries JSONB NOT NULL DEFAULT '[]',
  learnings JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  x DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  y DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS graph_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  UNIQUE (user_id, source, target)
);

CREATE TABLE IF NOT EXISTS research_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  scope JSONB NOT NULL DEFAULT '{"tags":[],"categories":[],"dateRange":"Anytime"}',
  title_manually_edited BOOLEAN NOT NULL DEFAULT false,
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
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, id)
);

CREATE INDEX IF NOT EXISTS research_messages_thread_position_idx ON research_messages (thread_id, position);

ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS storage_object_id TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS raw_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS extracted_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS summary_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS knowledge_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS workspace_labels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS markdown_storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL;
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS knowledge_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS workspace_labels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS embedding JSONB;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL;
