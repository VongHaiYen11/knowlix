ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS raw_path TEXT,
  ADD COLUMN IF NOT EXISTS ingest_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ingest_outputs JSONB NOT NULL DEFAULT '[]';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uploaded_files_ingest_status_check'
  ) THEN
    ALTER TABLE uploaded_files
      ADD CONSTRAINT uploaded_files_ingest_status_check
      CHECK (ingest_status IN ('pending', 'completed', 'skipped', 'failed'));
  END IF;
END $$;
