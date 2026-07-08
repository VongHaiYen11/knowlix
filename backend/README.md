# Knowlix Backend API

Backend service for Knowlix: a private knowledge workspace API with PostgreSQL persistence, cookie-based authentication, upload/source management, generated knowledge pages, graph links, DB-backed research chat threads, Gemini-powered research answers, daily inspiration, and maintenance linting.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL
- Zod validation
- Google Gemini SDK
- JWT session cookies
- bcrypt password hashing
- multer memory uploads

## Project Structure

```txt
src/
├── app.ts                  # Express app, middleware, route mounting
├── server.ts               # HTTP server startup only
├── config/                 # Typed env, cookies, Gemini/model helpers
├── database/               # PostgreSQL pool and migration runner
├── errors/                 # Typed app errors and global error handler
├── middleware/             # Async, validation, not-found, multer errors
├── modules/
│   ├── auth/               # Signup, login, logout, session cookie auth
│   ├── users/              # /me profile and password updates
│   ├── sources/            # Source CRUD, upload, files, background ingest
│   ├── knowledge/          # Knowledge page CRUD
│   ├── notes/              # Notes CRUD
│   ├── journal/            # Journal APIs
│   ├── graph/              # Knowledge graph APIs
│   ├── research/           # Research threads + Gemini answer streaming
│   ├── inspiration/        # Daily LLM inspiration sentence
│   └── maintenance/        # Knowledge lint report
├── types/
├── utils/
└── wiki/                   # Raw upload save and text-file ingest helpers
```

Layering rule:

```txt
routes -> controllers -> services -> repositories -> database
```

Routes register endpoints, controllers handle HTTP, services own workflows, and repositories own SQL.

## Environment

Create `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:123456@localhost:5432/knowlix
FRONTEND_ORIGIN=http://127.0.0.1:5173
JWT_SECRET=replace-me
COOKIE_NAME=knowlix_session
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
MAX_UPLOAD_MB=25
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

For production, use a strong `JWT_SECRET`. If the frontend and backend are served cross-site, set `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.

Clients may override the LLM model per request with:

```txt
X-Knowlix-Model: gemini-2.5-pro
```

If the header is missing or invalid, the backend falls back to `GEMINI_MODEL`.

## Fresh Database Setup

The canonical schema starts at:

```txt
backend/migrations/001_init.sql
```

Additional migrations are idempotent SQL files in the same folder and are applied alphabetically by `src/database/migrate.ts`.

Run PostgreSQL locally:

```bash
cd backend
docker compose up -d
```

Run migrations:

```bash
npm run db:migrate
```

Reset a local database manually if needed:

```bash
dropdb knowlix
createdb knowlix
npm run db:migrate
```

The schema creates:

- `app_users`
- `uploaded_files`
- `sources`
- `knowledge_entries`
- `notes`
- `journal_days`
- `graph_nodes`
- `graph_links`
- `research_threads`
- `research_messages`

Users are not seeded. Create an account through Sign up.

## Run Commands

Install dependencies:

```bash
cd backend
npm install
```

Run migrations:

```bash
npm run db:migrate
```

Start development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

The API listens on `http://127.0.0.1:4000` by default.

## Authentication

Knowlix uses a JWT stored in an HttpOnly cookie.

```txt
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/me
PATCH /api/v1/me
```

`PATCH /api/v1/me` updates the signed-in user's `name`, `email`, or password. Password changes require `currentPassword` and `newPassword`.

Signup/login response:

```json
{
  "user": {
    "id": "user_...",
    "email": "eleanor@example.com",
    "name": "Eleanor Vale",
    "initials": "EV"
  }
}
```

The token is not returned in JSON. The server sets:

```txt
Set-Cookie: knowlix_session=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
```

Frontend requests must include cookies:

```ts
fetch(url, { credentials: 'include' })
```

## Upload And Knowledge Pipeline

### Supported Source Types

Sources can be created manually with these domain types:

```txt
Note, PDF, Article, Bookmark, Image, Voice, File
```

Uploads are stored through multer memory storage and limited by `MAX_UPLOAD_MB`. The upload route accepts only PDF, DOCX, TXT, and Markdown files. The backend enforces both extension and compatible MIME type checks, with `application/octet-stream` allowed for browser/file-manager MIME quirks.

Accepted upload types:

```txt
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
text/plain
text/markdown
application/octet-stream
```

Accepted extensions:

```txt
.pdf
.docx
.txt
.md
.markdown
```

### Text-First Extraction

The automatic upload ingest is text-first:

- `.txt`, `.md`, and `.markdown` are read as UTF-8 text. Markdown is not parsed or converted; its original text is passed through.
- `.pdf` files are converted to plain text by the backend PDF extractor.
- `.docx` files are converted to raw plain text by the backend DOCX extractor.
- Gemini receives only the extracted text plus file metadata. Raw file bytes and file handles are not sent to Gemini.
- Unsupported upload types are rejected with `415 UNSUPPORTED_MEDIA_TYPE`.

### Summarizing Into Knowledge

For supported uploads, `runBackgroundIngest` performs this pipeline:

1. Save the raw file under `../raw/uploads/<date>/<fileId>-<safeName>`.
2. Create an `uploaded_files` row with `pending` ingest status.
3. Create a `sources` row with `Processing` status.
4. Extract or read plain text with `ingestRawFile`.
5. Send only the extracted text and metadata to Gemini for structured JSON output.
6. Update the source with the generated summary content, excerpt, tags, category, and `Processed` status.
7. Upsert generated `knowledge_entries` rows:
   - `slug` is derived from the file/page title with `slugify`.
   - `overview` is a short excerpt of the body.
   - `content` stores the page body.
   - `explanation` is seeded from the first text blocks.
   - `source_list` points back to the source.
   - `reference_list` records the raw upload path.
   - `timeline` records the generation event.
8. Mark the uploaded file as `completed`, or `failed` if extraction or Gemini JSON parsing fails.

### Creating Links Between Knowledge

Links are created in two places:

- During ingest, any `related` values on ingest pages and any `graphLinks` returned by the ingest helper are normalized with `slugify`, upserted as graph nodes, and inserted into `graph_links`.
- During maintenance linting, the backend scans knowledge `overview` and `content` for `[[wikilinks]]`. Missing linked concepts are inserted as placeholder graph nodes and linked from the referring page.

Graph node positions are deterministic. `graphPosition(slug)` hashes the slug to stable `x` and `y` values, so graph layout is repeatable without storing custom positions from the frontend.

Deleting a source removes generated knowledge pages that reference that source, then cleans related graph links/nodes so orphan placeholder graph items do not remain.

## Search And Research Behavior

### List/Search APIs

Source listing supports:

- `q`: title or excerpt search with `ILIKE`.
- `type`, `status`, `category`: exact filters.
- pagination through `page` and `pageSize`.

Knowledge listing supports:

- `q`: title or overview search with `ILIKE`.
- `tags`: overlap filter using PostgreSQL text arrays.
- `categories`: category match using `ANY`.
- pagination through `page` and `pageSize`.

Graph listing supports:

- `q`: graph node label search.
- `tags`: overlap filter.
- `categories`: category match.

### Research Answer Pipeline

`POST /api/v1/research/messages` streams a Gemini answer as Server-Sent Events.

The backend does the following:

1. Validate `question` and optional `scope`.
2. Load scoped knowledge entries for the signed-in user:
   - `scope.tags` filters with `tags && $tags`.
   - `scope.categories` filters with `category = ANY($categories)`.
   - `dateRange` is accepted for UI compatibility but is not currently applied in SQL.
3. Build a prompt from each matched knowledge page's title, slug, overview, and content.
4. Collect unique source references from `source_list`.
5. Instruct Gemini to answer strictly from the provided context.
6. Require markdown citations using exact source URLs from the available source list.
7. Stream chunks as:

```txt
data: {"text":"..."}
data: [DONE]
```

If no knowledge matches the selected scope, the prompt explicitly says no entries matched and instructs the model not to speculate.

### Research Thread Persistence

Research chat history is stored in PostgreSQL:

- `research_threads` stores `id`, `title`, `scope`, `title_manually_edited`, and timestamps.
- `research_messages` stores ordered user/assistant messages for each thread.

The frontend keeps a small local cache for resilience, but the canonical saved chat history is the database.

## Main APIs

All APIs below require the session cookie unless noted otherwise.

### Sources

```txt
GET    /api/v1/sources
GET    /api/v1/sources/:id
POST   /api/v1/sources
POST   /api/v1/sources/upload
GET    /api/v1/files/:id
PATCH  /api/v1/sources/:id
DELETE /api/v1/sources/:id
```

Upload accepts multipart form field `file` and returns immediately with an ingest status while background processing runs.

### Knowledge Entries

```txt
GET    /api/v1/knowledge
GET    /api/v1/knowledge/:slug
POST   /api/v1/knowledge
PATCH  /api/v1/knowledge/:slug
DELETE /api/v1/knowledge/:slug
```

### Notes

```txt
GET    /api/v1/notes
GET    /api/v1/notes/:id
POST   /api/v1/notes
PATCH  /api/v1/notes/:id
DELETE /api/v1/notes/:id
```

### Journal

```txt
GET   /api/v1/journal
POST  /api/v1/journal/:date/entries
PATCH /api/v1/journal/:date
```

### Graph

```txt
GET /api/v1/graph
```

### Research

```txt
GET    /api/v1/research/threads
POST   /api/v1/research/threads
PATCH  /api/v1/research/threads/:id
DELETE /api/v1/research/threads/:id
POST   /api/v1/research/messages
```

Thread payload:

```json
{
  "id": "thread-...",
  "title": "Untitled",
  "messages": [
    { "id": "u-1", "role": "user", "content": "What do I know about memory?" },
    { "id": "a-1", "role": "assistant", "content": "..." }
  ],
  "scope": {
    "tags": ["memory"],
    "categories": ["Cognition"],
    "dateRange": "Anytime"
  },
  "createdAt": "2026-07-08T10:00:00.000Z",
  "updatedAt": "2026-07-08T10:02:00.000Z",
  "titleManuallyEdited": false
}
```

### Inspiration

```txt
GET /api/v1/inspiration/today
```

Returns one short daily inspiration sentence generated by the selected LLM model.

### Maintenance

```txt
POST /api/v1/maintenance/lint
```

Returns:

```json
{ "report": "..." }
```

The lint workflow detects orphaned pages, creates graph placeholders for missing `[[wikilinks]]`, asks Gemini to find contradictions across knowledge overviews, marks contradicted pages as low confidence, and writes a markdown report to `backend/outputs/`.
