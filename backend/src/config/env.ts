import 'dotenv/config'

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true'
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'replace-me-in-production',
  cookieName: process.env.COOKIE_NAME ?? 'knowlix_session',
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  cookieSameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 25),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-2',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'knowlix-files',
  smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM ?? 'Knowlix',
}
