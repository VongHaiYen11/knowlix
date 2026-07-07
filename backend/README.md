# Knowlix Backend API

Backend service for Knowlix: a private research wiki API with PostgreSQL persistence, Google Gemini ingestion/research workflows, layered TypeScript modules, and HttpOnly-cookie authentication.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL
- Zod validation
- Google Gemini SDK
- JWT session cookies
- bcrypt password hashing

## Project Structure

```txt
src/
├── app.ts                  # Express app, middleware, route mounting
├── server.ts               # HTTP server startup only
├── config/                 # Typed environment, cookies, Gemini config
├── database/               # Shared pool
├── db/                     # Migration runner compatibility path
├── errors/                 # Typed app errors and global error handler
├── middleware/             # Async, validation, not-found, multer errors
├── modules/
│   ├── auth/               # Signup, login, logout, cookie auth middleware
│   ├── users/              # /me
│   ├── knowledge/          # Wiki page CRUD
│   ├── sources/            # Source CRUD, upload, file streaming, ingest
│   ├── notes/              # Notes CRUD
│   ├── journal/            # Journal APIs
│   ├── graph/              # Knowledge graph APIs
│   ├── research/           # Gemini-backed research SSE
│   └── maintenance/        # Lint/maintenance report
├── types/
├── utils/
└── wiki/                   # Raw-file ingest helpers
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

## Fresh Database Setup

This schema assumes local data can be recreated. The canonical schema lives in:

```txt
backend/migrations/001_init.sql
```

Reset a local database manually if needed:

```bash
dropdb knowlix
createdb knowlix
```

Or use the bundled PostgreSQL service:

```bash
cd backend
docker compose up -d
```

Then run migrations:

```bash
cd backend
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

Auth endpoints:

```txt
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/me
```

Signup:

```json
{
  "name": "Eleanor Vale",
  "email": "eleanor@example.com",
  "password": "password123"
}
```

Login:

```json
{
  "email": "eleanor@example.com",
  "password": "password123"
}
```

Signup/Login response:

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

There is no `DEV_AUTH_TOKEN` flow anymore.

## Main APIs

All APIs below require the session cookie.

### Sources

- `GET /api/v1/sources`
- `GET /api/v1/sources/:id`
- `POST /api/v1/sources`
- `POST /api/v1/sources/upload`
- `GET /api/v1/files/:id`
- `PATCH /api/v1/sources/:id`
- `DELETE /api/v1/sources/:id`

Upload accepts multipart form field `file` and returns immediately with an ingest status while background processing runs.

### Knowledge Entries

- `GET /api/v1/knowledge`
- `GET /api/v1/knowledge/:slug`
- `POST /api/v1/knowledge`
- `PATCH /api/v1/knowledge/:slug`
- `DELETE /api/v1/knowledge/:slug`

### Notes

- `GET /api/v1/notes`
- `GET /api/v1/notes/:id`
- `POST /api/v1/notes`
- `PATCH /api/v1/notes/:id`
- `DELETE /api/v1/notes/:id`

### Journal

- `GET /api/v1/journal`
- `POST /api/v1/journal/:date/entries`
- `PATCH /api/v1/journal/:date`

### Graph

- `GET /api/v1/graph`

### Research

- `POST /api/v1/research/messages`

Streams Server-Sent Events:

```txt
data: {"text":"..."}
data: [DONE]
```

### Maintenance

- `POST /api/v1/maintenance/lint`

Returns:

```json
{ "report": "..." }
```

The report is also written to `outputs/lint-YYYY-MM-DD.md`.
