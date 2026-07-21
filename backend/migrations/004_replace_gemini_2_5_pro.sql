UPDATE user_ai_customizations
SET
  ingest_model = CASE
    WHEN ingest_model = 'gemini-2.5-pro' THEN 'gemini-2.5-flash'
    ELSE ingest_model
  END,
  research_model = CASE
    WHEN research_model = 'gemini-2.5-pro' THEN 'gemini-2.5-flash'
    ELSE research_model
  END,
  updated_at = now()
WHERE ingest_model = 'gemini-2.5-pro'
   OR research_model = 'gemini-2.5-pro';
