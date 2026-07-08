<div align="center">

# 🚀 Knowlix Backend

**Express + PostgreSQL backend for a private AI-assisted knowledge workspace.**

Inspired by Andrej Karpathy’s idea of building personal knowledge systems around files, context, and LLM-assisted workflows: [karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

![Node.js](https://img.shields.io/badge/Node.js-ES2022-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-LLM_%2B_Embeddings-4285F4?logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Storage-3FCF8E?logo=supabase&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)

</div>

## 🧭 System Overview

Knowlix backend powers a private knowledge workspace where users can upload source files, extract durable knowledge pages, ask grounded research questions, keep notes and journal entries, and maintain account settings.

The backend is responsible for:

- authenticating users with cookie-based JWT sessions
- storing relational app state in PostgreSQL
- storing file bodies and generated Markdown in Supabase Storage
- extracting text from PDF, DOCX, TXT, and Markdown uploads
- generating source summaries and Knowledge pages with Gemini
- creating embeddings for semantic retrieval with pgvector
- streaming research answers from Gemini with cited Knowledge references
- isolating all user data by `user_id`

## ✨ Core Features

- 🔐 Signup, login, logout, session validation, and profile/password updates.
- 📥 Source upload for PDF, DOCX, TXT, Markdown, and note promotion to Source of Truth.
- 🧾 Storage-backed raw files, extracted text, source summaries, Knowledge Markdown, revisions, and notes.
- 🧠 AI ingest pipeline that extracts source-level summaries and canonical Knowledge pages.
- 🔄 Ingest actions for `create`, `update`, `merge`, `replace`, `link_only`, and `skip`.
- 🔎 Hybrid retrieval over Knowledge entries using PostgreSQL full-text search and pgvector embeddings.
- 💬 Research answer streaming with Server-Sent Events.
- 📚 DB-backed research threads and messages with per-message Knowledge references.
- 📓 Journal entries grouped by date with optional tags.
- 🛠 Maintenance linting for orphaned Knowledge pages, missing wikilinks, and contradictions.
- ✨ Daily inspiration generation with Gemini fallback text.
- 🇻🇳 Vietnam-time helpers for app-facing dates.

## 🛠 Tech Stack

![Node.js](https://img.shields.io/badge/Runtime-Node.js-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/API-Express-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/Vector_Search-pgvector-4169E1)
![Zod](https://img.shields.io/badge/Validation-Zod-3E67B1)
![JWT](https://img.shields.io/badge/Auth-JWT_Cookie-2D2A26)
![bcrypt](https://img.shields.io/badge/Passwords-bcrypt-5E7D63)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Object_Storage-Supabase-3FCF8E?logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Local_DB-Docker_Compose-2496ED?logo=docker&logoColor=white)

- **Runtime / language:** Node.js, TypeScript, ES modules
- **HTTP framework:** Express
- **Database:** PostgreSQL with `pgvector`
- **Database access:** raw SQL through `pg`
- **Validation:** Zod request schemas
- **Authentication:** JWT stored in an HttpOnly cookie
- **Password hashing:** bcryptjs
- **File uploads:** multer memory storage
- **Text extraction:** pdf-parse, mammoth, UTF-8 text reading
- **LLM and embeddings:** `@google/genai`
- **Object storage:** Supabase Storage
- **Container support:** Docker Compose for local PostgreSQL + pgvector

## 🏗 Architecture Overview

The backend follows a simple layered module structure:

```text
HTTP route -> controller -> service -> repository -> PostgreSQL / Storage / Gemini
```

### Routing Layer

- **What was chosen:** Express routers per module under `src/modules/*/*.routes.ts`.
- **Why it was chosen:** Each domain owns its routes and middleware.
- **What problem it solves:** Keeps `/auth`, `/sources`, `/knowledge`, `/research`, `/journal`, and other domains independently understandable.
- **Trade-off:** Cross-module workflows, such as note promotion into sources, must explicitly import another module’s repository/service.

### Controller Layer

- **What was chosen:** Controllers translate HTTP requests into service calls.
- **Why it was chosen:** Controllers stay thin and leave business logic outside HTTP-specific code.
- **What problem it solves:** Makes route behavior easy to scan and keeps response formatting close to the API boundary.
- **Trade-off:** Some streaming behavior, such as research SSE, necessarily stays controller-aware.

### Service Layer

- **What was chosen:** Services own workflows such as upload ingest, research answer generation, account updates, and note promotion.
- **Why it was chosen:** Most Knowlix operations combine database writes, storage calls, LLM calls, and validation-derived data.
- **What problem it solves:** Centralizes business logic instead of spreading it across controllers and repositories.
- **Trade-off:** Services can become long when a flow is complex, as seen in ingest.

### Repository Layer

- **What was chosen:** Hand-written SQL through `pg`.
- **Why it was chosen:** The schema uses PostgreSQL JSONB, arrays, full-text search, and pgvector operators directly.
- **What problem it solves:** Gives precise control over retrieval queries, upserts, transactions, and indexes.
- **Trade-off:** There is no ORM-level abstraction; schema changes must be propagated manually.

### Database Layer

- **What was chosen:** PostgreSQL plus `pgvector`.
- **Why it was chosen:** The app needs relational user isolation, source metadata, chat history, JSON fields, tags, full-text search, and vector similarity in one database.
- **What problem it solves:** Avoids splitting metadata and semantic retrieval across separate systems.
- **Trade-off:** Vector search tuning and schema evolution are handled directly in SQL.

### External Integrations

- **Gemini:** used for embeddings, source/Knowledge generation, research answer generation, inspiration, and maintenance contradiction checks.
- **Supabase Storage:** stores raw uploads and generated text/Markdown files.
- **PostgreSQL:** stores metadata, relational ownership, JSON provenance, vectors, search vectors, and chat history.

### Middleware

- `cookie-parser` reads session cookies.
- CORS allows the configured frontend origin with credentials.
- `validateBody` parses request bodies with Zod.
- `requireAuth` loads the current user and attaches it to the request.
- `asyncRoute` forwards async errors to the global error handler.
- `multerErrorMiddleware` maps upload size errors to a typed API error.
- `notFoundMiddleware` converts unmatched routes to a 404 response.

## 🔄 Main Processing Flows

### 1. Authentication Flow

**Trigger:** `POST /api/v1/auth/signup` or `POST /api/v1/auth/login`

1. Route validates request body with `signupSchema` or `loginSchema`.
2. `authController` calls `authService`.
3. Signup checks for an existing email through `authRepository.findByEmail`.
4. Signup hashes the password with bcrypt using 12 rounds.
5. Login compares password hashes with bcrypt.
6. A JWT is signed with `signSessionToken(user.id)`.
7. The token is stored in an HttpOnly cookie using `sessionCookieOptions`.
8. The response returns the safe user object, not the token.

**Failure cases:**

- duplicate email returns `409 CONFLICT`
- invalid credentials return `401 UNAUTHORIZED`
- invalid payload returns `400 VALIDATION_ERROR`

### 2. Protected Route Flow

**Trigger:** any route using `requireAuth`

1. Middleware reads the configured cookie name from `env.cookieName`.
2. It also accepts a `token` query parameter.
3. `verifySessionToken` verifies the JWT and reads `sub`.
4. `authService.findUserById` loads the user from PostgreSQL.
5. The user object is attached to `req.user`.

**Design choice:**

- **What was chosen:** per-request database lookup for the session user.
- **Why it was chosen:** each request gets current user data and deleted users are rejected.
- **What problem it solves:** avoids trusting only the JWT payload for authorization.
- **Trade-off:** every protected request performs a user lookup.

### 3. Source CRUD Flow

**Trigger:** `/api/v1/sources`

1. `sourcesRouter` applies `requireAuth`.
2. Create/update bodies are validated with Zod schemas.
3. `sourcesService` builds the domain object and optional storage object.
4. `sourcesRepository` writes to `sources`.
5. Responses are mapped with `sourceRow`.

**Data access rule:** every source query includes `user_id`, so one user cannot fetch another user’s sources.

### 4. Note Promotion Flow

**Trigger:** `POST /api/v1/notes/:id/source`

1. The route is authenticated by `requireAuth`.
2. `notesService.promoteToSource` loads the note by `user_id` and `id`.
3. The note Markdown is read from Supabase Storage when `storage_object_id` exists.
4. Empty note content is rejected with `400 VALIDATION_ERROR`.
5. The note body is uploaded as a `raw_source` storage object.
6. An `uploaded_files` row is created with `pending` ingest status.
7. A `sources` row is created as `Markdown` with `Processing` status.
8. The original note row is deleted.
9. `runBackgroundIngest` starts the same ingest flow used by file uploads.

**Design choice:**

- **What was chosen:** note promotion reuses source upload infrastructure.
- **Why it was chosen:** promoted notes should become Source of Truth and produce Knowledge like uploaded Markdown files.
- **What problem it solves:** avoids a separate “note ingest” pipeline.
- **Trade-off:** promotion is destructive for the note row; after promotion, the source owns the content flow.

## 📥 Ingest Flow

The ingest pipeline is the most important backend workflow. It converts user source material into source summaries and Knowledge pages.

### Trigger/API Endpoint

```http
POST /api/v1/sources/upload
Content-Type: multipart/form-data
```

Input:

- field name: `file`
- accepted extensions: `.pdf`, `.docx`, `.txt`, `.md`, `.markdown`
- size limited by `MAX_UPLOAD_MB`

The same ingest function is also triggered by:

```http
POST /api/v1/notes/:id/source
```

after a note is converted into a Markdown source.

### Step-by-Step Pipeline

#### 1. Authenticate the user

- **Module:** `sources.routes.ts`, `auth.middleware.ts`
- **What happens:** `requireAuth` verifies the JWT cookie and loads the user.
- **Tables read:** `app_users`
- **Failure cases:** missing/invalid token returns `401 UNAUTHORIZED`.
- **Why this step exists:** all source, storage, and Knowledge data is user-scoped.

#### 2. Validate upload metadata

- **Module:** `sources.controller.ts`, `sources.upload.ts`
- **What happens:** multer receives a single in-memory file. `isAllowedUploadFile` validates extension and MIME compatibility.
- **Failure cases:** missing file returns `400 VALIDATION_ERROR`; unsupported type returns `415 UNSUPPORTED_MEDIA_TYPE`; oversize upload returns `413 PAYLOAD_TOO_LARGE`.
- **Why this step exists:** downstream extractors only support PDF, DOCX, TXT, and Markdown.

#### 3. Store raw source bytes

- **Module:** `sources.service.ts`, `storageService.upload`
- **What happens:** the raw file buffer is uploaded to Supabase Storage with kind `raw_source`.
- **Tables written:** `storage_objects`
- **External calls:** Supabase Storage upload
- **Failure cases:** missing Supabase config or storage upload failure returns an error through the global handler.
- **Why this step exists:** file bodies stay outside PostgreSQL while metadata remains queryable.

#### 4. Create upload and source records

- **Module:** `sources.service.ts`, `sources.repository.ts`
- **What happens:** the backend creates:
  - an `uploaded_files` row with `pending` ingest status
  - a `sources` row with `Processing` status
- **Tables written:** `uploaded_files`, `sources`
- **Response:** upload returns immediately with source metadata and pending ingest status.
- **Why this step exists:** the UI can show a processing source before AI ingest finishes.

#### 5. Start background ingest

- **Module:** `sources.service.ts`, `sources.ingest-service.ts`
- **What happens:** `runBackgroundIngest` is called without awaiting it.
- **Design choice:**
  - **What was chosen:** in-process fire-and-forget background processing.
  - **Why it was chosen:** keeps upload latency low without adding a queue dependency.
  - **What problem it solves:** large extraction and LLM calls do not block the upload response.
  - **Trade-off:** no durable job queue, retry scheduler, or worker isolation is implemented.

#### 6. Download raw storage object

- **Module:** `runBackgroundIngest`, `storageService.download`
- **What happens:** the raw object is downloaded from Supabase Storage.
- **Tables read:** `storage_objects`
- **External calls:** Supabase Storage download
- **Failure cases:** missing object or storage download failure marks the uploaded file as `failed`.
- **Why this step exists:** ingest works from the canonical stored raw object.

#### 7. Extract plain text

- **Module:** `extractText` in `src/wiki/ingest.ts`
- **What happens:**
  - TXT/Markdown: read as UTF-8
  - PDF: `pdf-parse`
  - DOCX: `mammoth.extractRawText`
- **Failure cases:** unsupported extension or no readable text fails ingest.
- **Why this step exists:** Gemini receives extracted text, not raw file bytes.

#### 8. Embed source snippet for candidate search

- **Module:** `sources.ingest-service.ts`, `embedText`
- **What happens:** the backend embeds the first 1000 characters of extracted text, falling back to the filename.
- **External calls:** Gemini embedding model from `GEMINI_EMBEDDING_MODEL`
- **Failure behavior:** embedding failure falls back to an empty vector in candidate selection.
- **Why this step exists:** candidate Knowledge pages help the ingest prompt decide whether to create, update, merge, replace, link, or skip.

#### 9. Retrieve candidate Knowledge entries

- **Module:** `sources.ingest-service.ts`
- **What happens:** PostgreSQL ranks existing Knowledge entries for the same user using:
  - full-text rank over title, overview, and tags
  - vector similarity via `embedding <=> $vector`
- **Tables read:** `knowledge_entries`
- **Indexes used:** GIN full-text index and HNSW vector index are defined in the migration.
- **Why this step exists:** the LLM needs local candidate context to avoid always creating duplicate Knowledge pages.

#### 10. Generate ingest JSON

- **Module:** `ingestRawFile`, `getIngestPrompt`
- **What happens:** Gemini receives:
  - filename
  - uploaded source type
  - extracted file kind
  - raw storage URL
  - candidate Knowledge metadata
  - extracted text
- **External calls:** Gemini content generation with JSON response MIME type
- **Expected response:** source summary plus pages with actions.
- **Failure cases:** empty Gemini response or invalid JSON fails ingest.
- **Why this step exists:** Knowlix turns raw source material into clean, standalone Knowledge pages.

#### 11. Normalize LLM output

- **Module:** `normalizeIngestResult`
- **What happens:** backend cleans title numbering, ensures Markdown starts with one H1, normalizes action names, extracts tags, and falls back to a generated page if no pages are returned.
- **Why this step exists:** LLM output must be normalized before persistence.
- **Trade-off:** normalization is defensive, not a full schema validator for every nested field.

#### 12. Store extracted text and source summary

- **Module:** `storageService.upload`
- **What happens:** extracted text is stored as `extracted_text`; source summary Markdown is stored as `source_summary`.
- **Tables written:** `storage_objects`
- **Why this step exists:** PostgreSQL stores references and metadata, while file-like bodies remain in object storage.

#### 13. Update the source row

- **Module:** `sources.ingest-service.ts`
- **What happens:** the source gets its generated title, category, tags, excerpt, storage object IDs, and status.
- **Tables written:** `sources`
- **Status behavior:** `Processed` when ingest succeeds; `Queued` when skipped or when a failure fallback writes an error excerpt.

#### 14. Upsert Knowledge pages

- **Module:** `sources.ingest-service.ts`
- **What happens:** for each generated page:
  - `skip` does nothing
  - `link_only` updates source provenance and timeline
  - `create`, `update`, `merge`, and `replace` upload Knowledge Markdown and upsert `knowledge_entries`
- **Tables written:** `knowledge_entries`, `knowledge_revisions`, `knowledge_source_links`, `storage_objects`
- **Conflict target:** `(user_id, slug)`
- **Why this step exists:** one user can revise a canonical Knowledge page while another user can independently own the same slug.

#### 15. Generate Knowledge embeddings

- **Module:** `embedText`
- **What happens:** the Knowledge title, content excerpt, and tags are embedded into 768 dimensions.
- **Tables written:** `knowledge_entries.embedding`
- **Why this step exists:** research uses semantic retrieval over Knowledge pages.

#### 16. Track provenance and revisions

- **Module:** `sources.ingest-service.ts`
- **What happens:** the backend stores:
  - source materials in `source_list`
  - timeline events like generated, updated, merged, replaced, or linked
  - revision rows with model and reason
  - relation rows in `knowledge_source_links`
- **Why this step exists:** Knowledge pages remain explainable and traceable to source materials.

#### 17. Finish or fail ingest

- **Module:** `sourcesRepository.updateUploadedFileStatus`, `sourcesRepository.failUploadedFile`
- **What happens:** the upload status becomes `completed`, `skipped`, or `failed`.
- **Failure behavior:** errors are logged, uploaded file status becomes `failed`, and source excerpt records the failure message.

## 🔎 Query Flow

The query flow powers research chat answers grounded in Knowledge pages.

### Trigger/API Endpoint

```http
POST /api/v1/research/messages
Content-Type: application/json
```

Request body:

```json
{
  "question": "What is self-attention?",
  "scope": {
    "tags": [],
    "categories": []
  }
}
```

Response type:

- Server-Sent Events (`text/event-stream`)
- first event contains selected Knowledge references
- later events stream generated answer text
- final event is `[DONE]`

### Step-by-Step Pipeline

#### 1. Authenticate and validate

- **Module:** `research.routes.ts`, `research.schemas.ts`
- **What happens:** `requireAuth` loads the user and Zod validates `question` and optional `scope`.
- **Failure cases:** invalid session or empty question is rejected before retrieval.
- **Why this step exists:** research must only search the signed-in user’s Knowledge pages.

#### 2. Resolve model choice

- **Module:** `requestedModel`
- **What happens:** the backend reads `X-Knowlix-Model` if it matches an allowed safe string pattern; otherwise it uses `GEMINI_MODEL`.
- **Why this step exists:** the frontend can choose a Gemini model while the server keeps a default fallback.
- **Trade-off:** the backend validates only header shape, not membership in a fixed allowlist.

#### 3. Embed the user question

- **Module:** `embedText`
- **What happens:** the question is embedded using `GEMINI_EMBEDDING_MODEL` with 768 output dimensions.
- **Failure behavior:** embedding failure is caught and becomes an empty vector.
- **Why this step exists:** semantic similarity complements keyword search.

#### 4. Retrieve candidate Knowledge pages

- **Module:** `researchRepository.retrieveCandidates`
- **What happens:** PostgreSQL searches `knowledge_entries` for the same `user_id`.
- **Ranking combines:**
  - `ts_rank_cd` over a `search_vector`
  - vector similarity using `1 - (embedding <=> $vector)`
  - updated time as a tie-breaker
- **Filters:** repository supports tag/category filtering, though the current service asks against all Knowledge by passing empty filters.
- **Tables read:** `knowledge_entries`
- **Why this step exists:** the LLM should answer from relevant user-owned Knowledge pages, not from arbitrary model knowledge.

#### 5. Let Gemini select the most useful candidates

- **Module:** `getResearchSelectionPrompt`
- **What happens:** the backend sends a compact candidate list to Gemini and asks for a JSON array of selected slugs.
- **Failure behavior:** if selection JSON cannot be parsed, the service falls back to top-ranked candidates.
- **Why this step exists:** hybrid search finds candidates; the LLM narrows them to the most answer-relevant pages.
- **Trade-off:** this adds an extra LLM call before answer generation.

#### 6. Load full Knowledge Markdown

- **Module:** `storageService.readText`
- **What happens:** for selected Knowledge pages, Markdown is read from Supabase Storage using `markdown_storage_object_id`.
- **Tables read:** `storage_objects`
- **External calls:** Supabase Storage download
- **Why this step exists:** candidate metadata is not enough; the answer prompt needs page content.

#### 7. Build numbered Knowledge references

- **Module:** `researchService.streamAnswer`
- **What happens:** each selected page gets a reference number, slug, title, tags, and category.
- **Citation format:** the answer prompt instructs Gemini to cite pages as `[1]`, `[2]`, etc.
- **Why this step exists:** answers reference Knowledge pages rather than raw source URLs.

#### 8. Construct final answer prompt

- **Module:** `getResearchAnswerPrompt`
- **What happens:** the prompt includes:
  - strict instruction to answer only from Knowledge Context
  - selected Knowledge Markdown
  - numbered Knowledge reference list
  - citation rules
  - user question
- **Guardrail:** if the answer is not in context, the model is instructed to say so and not speculate.

#### 9. Stream Gemini answer

- **Module:** `researchController.message`
- **What happens:** `generateContentStream` emits text chunks. The controller writes SSE data events.
- **Failure behavior:** streaming errors are logged and sent as a final text event before closing the stream.
- **Why this step exists:** the UI can display answers incrementally.

#### 10. Save thread history

- **Module:** `researchRepository.upsertThread`
- **Trigger:** separate `/api/v1/research/threads` save endpoint from the client.
- **What happens:** the thread row is upserted in a transaction, existing messages are deleted, and the submitted message list is reinserted with positions and references.
- **Tables written:** `research_threads`, `research_messages`
- **Why this step exists:** chat state is canonical in PostgreSQL, not browser-only storage.

## 🗄 Database Design

The database is PostgreSQL with the `vector` extension enabled.

### Main Tables

| Table | Purpose |
|---|---|
| `app_users` | User identity, email, password hash, name, initials |
| `uploaded_files` | Upload metadata and ingest status |
| `storage_objects` | Supabase bucket/key/url metadata for stored file bodies |
| `sources` | Source of Truth metadata and summary pointers |
| `knowledge_entries` | Canonical user Knowledge pages, search vectors, embeddings, provenance |
| `knowledge_revisions` | Revision history for generated/edited Knowledge Markdown |
| `knowledge_source_links` | Links between Knowledge pages and source materials |
| `notes` | Standalone notes with Markdown storage pointers |
| `journal_entries` | Dated quick journal notes |
| `research_threads` | Saved research chat thread metadata |
| `research_messages` | Ordered chat messages and reference lists |

### Important Indexes

- `sources_user_updated_idx` for user-scoped source listing.
- GIN indexes on source and Knowledge tag arrays.
- `knowledge_search_vector_idx` for PostgreSQL full-text search.
- `knowledge_embedding_idx` using HNSW for vector similarity.
- `research_threads_user_updated_idx` for chat history ordering.
- `research_messages_thread_position_idx` for ordered message loading.
- `journal_entries_user_date_idx` for grouped journal date retrieval.

### Database Design Choice

- **What was chosen:** PostgreSQL stores both relational app data and vectors.
- **Why it was chosen:** Knowlix combines accounts, ownership, file metadata, JSON provenance, chat history, full-text search, and semantic search.
- **What problem it solves:** a single database enforces user isolation and supports retrieval without a separate vector database.
- **Trade-off:** vector retrieval scale and tuning are PostgreSQL/pgvector concerns rather than delegated to a specialized vector service.

### Object Storage Responsibility

Supabase Storage stores file-like content:

- raw source bytes
- extracted text
- source summary Markdown
- Knowledge Markdown
- Knowledge revision Markdown
- note Markdown

PostgreSQL stores the storage object IDs and metadata. This keeps rows compact while preserving relational ownership and search fields.

## 🧠 AI / LLM Integration

### Gemini Client

`src/config/gemini.ts` creates a Google GenAI client from `GEMINI_API_KEY`.

### Models

- `GEMINI_MODEL` is the default content generation model.
- `GEMINI_EMBEDDING_MODEL` is used for embeddings.
- `X-Knowlix-Model` can override the generation model per request.

### Prompt Modules

Prompts are centralized under `src/prompts`:

- `ingest.prompt.ts` for source-to-Knowledge extraction
- `research.prompt.ts` for candidate selection and grounded answer generation
- `maintenance.prompt.ts` for linting Knowledge entries
- `inspiration.prompt.ts` for daily inspiration

### Retrieval-Augmented Generation

- Ingest embeds generated Knowledge pages and stores vectors in PostgreSQL.
- Research embeds the user question.
- PostgreSQL retrieves candidates with hybrid full-text and vector ranking.
- Gemini selects final Knowledge pages.
- Gemini answers with numbered Knowledge-page references.

### Guardrails Implemented in Prompts

- Research answers must be based strictly on provided Knowledge Context.
- If the answer is unavailable in context, the prompt instructs the model not to speculate.
- Citation output must use bracketed reference numbers, not URLs.
- Ingest prompts ask for standalone Knowledge pages, normalized headings, source summaries, and explicit merge/replace reasons.

## 🔐 Authentication & Authorization

- Passwords are hashed with bcrypt.
- Sessions are JWTs signed with `JWT_SECRET`.
- Session tokens are stored in HttpOnly cookies.
- Protected routes use `requireAuth`.
- Most data access methods include `user_id` in SQL conditions.
- Knowledge slugs are unique per user via `PRIMARY KEY (user_id, slug)`.
- Research thread upserts include an ownership check; if an ID belongs to another user, the write is rejected.

## 📡 API Documentation

All protected endpoints require a valid session cookie unless noted.

### Health

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/health` | Health check | No |

### Auth

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | `{ name, email, password }` | `{ user }` and session cookie |
| `POST` | `/api/v1/auth/login` | `{ email, password }` | `{ user }` and session cookie |
| `POST` | `/api/v1/auth/logout` | none | `{ ok: true }` |

### User

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/me` | Return current authenticated user |
| `PATCH` | `/api/v1/me` | Update name, email, or password |

### Sources and Files

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/sources` | List sources with pagination and filters |
| `POST` | `/api/v1/sources` | Create a source metadata record |
| `POST` | `/api/v1/sources/upload` | Upload source file and start ingest |
| `GET` | `/api/v1/sources/:id` | Get source metadata |
| `GET` | `/api/v1/sources/:id/content` | Return source summary Markdown |
| `PATCH` | `/api/v1/sources/:id` | Update source metadata |
| `DELETE` | `/api/v1/sources/:id` | Delete source and related Knowledge entries |
| `GET` | `/api/v1/files/:id` | Return uploaded file inline |
| `GET` | `/api/v1/files/:id/preview` | Return DOCX HTML preview |

### Knowledge

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/knowledge` | List Knowledge entries |
| `POST` | `/api/v1/knowledge` | Create manual Knowledge entry |
| `GET` | `/api/v1/knowledge/:slug` | Get Knowledge metadata |
| `GET` | `/api/v1/knowledge/:slug/content` | Return Knowledge Markdown |
| `PATCH` | `/api/v1/knowledge/:slug` | Update Knowledge entry |
| `POST` | `/api/v1/knowledge/:slug/proposals` | Save proposed Knowledge update |
| `DELETE` | `/api/v1/knowledge/:slug` | Delete Knowledge entry |

### Notes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/notes` | List notes |
| `POST` | `/api/v1/notes` | Create note |
| `GET` | `/api/v1/notes/:id` | Get note metadata |
| `GET` | `/api/v1/notes/:id/content` | Return note Markdown |
| `PATCH` | `/api/v1/notes/:id` | Update note |
| `POST` | `/api/v1/notes/:id/source` | Promote note to Source of Truth |
| `DELETE` | `/api/v1/notes/:id` | Delete note |

### Journal

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/journal` | List journal days grouped by date |
| `POST` | `/api/v1/journal/:date/entries` | Append a journal entry |

### Research

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/research/threads` | List saved research threads |
| `POST` | `/api/v1/research/threads` | Save a research thread |
| `PATCH` | `/api/v1/research/threads/:id` | Update a research thread |
| `DELETE` | `/api/v1/research/threads/:id` | Delete a research thread |
| `POST` | `/api/v1/research/messages` | Stream research answer as SSE |

### Maintenance and Inspiration

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/maintenance/lint` | Generate Knowledge maintenance report |
| `GET` | `/api/v1/inspiration/today` | Generate or return daily inspiration payload |

## ⚙️ Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | API server port | No, defaults to `4000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes for database access |
| `FRONTEND_ORIGIN` | CORS origin | No, defaults to `http://127.0.0.1:5173` |
| `JWT_SECRET` | JWT signing secret | No fallback exists, but production should set it |
| `COOKIE_NAME` | Session cookie name | No, defaults to `knowlix_session` |
| `COOKIE_SECURE` | Sets secure cookie flag | No, defaults to `false` |
| `COOKIE_SAME_SITE` | Cookie SameSite mode | No, defaults to `lax` |
| `MAX_UPLOAD_MB` | Max upload size for multer | No, defaults to `25` |
| `GEMINI_API_KEY` | Google Gemini API key | Yes for AI calls |
| `GEMINI_MODEL` | Default generation model | No, defaults to `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Embedding model | No, defaults to `gemini-embedding-2` |
| `SUPABASE_URL` | Supabase project URL | Yes for storage operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes for storage operations |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | No, defaults to `knowlix-files` |

## 📁 Project Structure

```text
backend/
├── migrations/
│   └── 001_init.sql              # Canonical fresh database schema
├── src/
│   ├── app.ts                    # Express app, middleware, route mounting
│   ├── server.ts                 # HTTP server startup
│   ├── config/                   # env, cookies, Gemini, model helpers
│   ├── database/                 # pg pool and migration runner
│   ├── errors/                   # AppError classes and global handler
│   ├── lib/                      # JWT, embeddings, storage integrations
│   ├── middleware/               # auth-independent middleware utilities
│   ├── modules/
│   │   ├── auth/                 # signup/login/logout
│   │   ├── users/                # current user profile/password
│   │   ├── sources/              # source CRUD, upload, ingest, file preview
│   │   ├── knowledge/            # Knowledge CRUD and proposals
│   │   ├── notes/                # notes and note promotion
│   │   ├── journal/              # dated journal entries
│   │   ├── research/             # research retrieval, SSE answers, threads
│   │   ├── maintenance/          # lint report generation
│   │   └── inspiration/          # daily inspiration
│   ├── prompts/                  # Gemini prompt builders
│   ├── types/                    # shared request types
│   ├── utils/                    # text, date, pagination, query helpers
│   └── wiki/                     # file extraction and ingest normalization
├── docker-compose.yml            # local pgvector PostgreSQL
├── package.json
└── tsconfig.json
```

## 🚀 Running Locally

Install dependencies:

```bash
npm install
```

Start local PostgreSQL with pgvector:

```bash
docker compose up -d
```

Run migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Start compiled output:

```bash
npm run start
```

## 🐳 Docker / Deployment

`docker-compose.yml` defines one local database service:

- image: `pgvector/pgvector:pg16`
- exposed port: `5432`
- database: `knowlix`
- user/password: `knowlix`
- volume: `knowlix-postgres-data`
- healthcheck: `pg_isready`

The repository does not define a backend Dockerfile.

## 🧯 Error Handling & Validation

### Validation

- Body validation uses Zod schemas through `validateBody`.
- Validation failures return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

### Error Response Shape

Typed app errors return:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Source not found",
    "details": {}
  }
}
```

### Logging

- Unexpected errors are logged with `console.error`.
- Ingest logs start, finish, and failure events.
- Research streaming errors are logged and also emitted to the SSE stream as text.
- Maintenance JSON parse failures are logged.

## 📈 Scalability & Design Considerations

### User-Scoped Data Model

- **What was chosen:** almost every table includes `user_id`, and queries filter by `user_id`.
- **Why it was chosen:** Knowlix is a private workspace.
- **What problem it solves:** prevents cross-user reads and keeps slugs unique within a user’s library.
- **Trade-off:** all cross-user collaboration would require additional sharing/permission tables.

### Storage-Backed Large Content

- **What was chosen:** raw files and generated Markdown live in Supabase Storage; PostgreSQL stores references.
- **Why it was chosen:** files and long Markdown bodies are not ideal as primary relational row payloads.
- **What problem it solves:** keeps database rows smaller while preserving queryable metadata.
- **Trade-off:** reading full content requires a storage download.

### Hybrid Retrieval

- **What was chosen:** PostgreSQL full-text search plus pgvector embedding similarity.
- **Why it was chosen:** Knowledge questions can match exact terms or semantic meaning.
- **What problem it solves:** improves recall compared with only keyword search or only vector search.
- **Trade-off:** ranking is hand-tuned in SQL and may need future evaluation.

### Transactional Research Thread Saves

- **What was chosen:** research thread upsert deletes and reinserts messages inside a transaction.
- **Why it was chosen:** the client sends the full current thread state.
- **What problem it solves:** keeps message order and references consistent.
- **Trade-off:** partial message updates are not optimized.

### In-Process Background Ingest

- **What was chosen:** upload returns immediately and ingest continues in the same Node.js process.
- **Why it was chosen:** simple implementation with no extra job infrastructure.
- **What problem it solves:** improves upload responsiveness while keeping the codebase small.
- **Trade-off:** no durable retry queue, concurrency control, or worker scaling is implemented.

### Modular Route/Service/Repository Boundaries

- **What was chosen:** each domain has routes, controllers, services, repositories, and schemas.
- **Why it was chosen:** Knowlix has multiple domains that evolve independently.
- **What problem it solves:** keeps auth, sources, knowledge, research, journal, and notes maintainable.
- **Trade-off:** shared cross-module operations require explicit imports and coordination.

## 🛣 Future Improvements

These are suggestions based on current code shape, not implemented features:

- Add a durable background job queue for ingest retries and worker isolation.
- Add structured logging and request correlation IDs.
- Add OpenAPI/Swagger documentation generated from route schemas.
- Add automated tests for auth, ingest failure cases, retrieval, and thread persistence.
- Add rate limiting for auth, upload, and LLM-backed endpoints.
- Add observability around Gemini latency, storage failures, and retrieval quality.
- Add an evaluation harness for retrieval ranking and answer citation quality.
- Add admin or maintenance dashboards for failed ingests and low-confidence Knowledge pages.
- Add more explicit model allowlisting for `X-Knowlix-Model`.
