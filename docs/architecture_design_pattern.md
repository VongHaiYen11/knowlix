# Knowlix Architecture and Design Patterns

This document is the architecture source of truth for Knowlix. It explains the current system shape, the dependency rules that code must follow, and the design patterns used to keep ingestion, research, storage, and external integrations maintainable.

When code, API contracts, persistence behavior, external-provider workflows, or user-visible flows change, update this document and the affected workspace README files in the same change.

## Product Architecture

Knowlix is an LLM Wiki-inspired personal knowledge workspace. The product keeps three conceptual layers separate:

1. **Source of Truth**: user-owned raw material such as uploaded files, promoted notes, and synced Google Drive files. These records are durable and inspectable.
2. **Knowledge**: generated Markdown pages, summaries, tags, relationships, and embeddings derived from sources. The LLM can create, update, merge, replace, or link these pages, but every generated page remains grounded in source records.
3. **Research**: question-answer workflows over Knowledge, with numbered references back to retrieved entries. Useful research threads can be preserved as part of the user's evolving workspace.

This differs from plain query-time RAG. Knowlix does not only retrieve chunks when the user asks a question; it also compiles and maintains a durable Knowledge layer during ingestion.

## Backend Boundary

Backend modules follow this dependency direction:

```text
route -> controller -> service/use case -> repository or infrastructure adapter
```

Dependencies should only move inward. Routes do not own business logic. Controllers do not query the database. Services and use cases do not depend on Express request objects. Repositories and adapters hide provider-specific or persistence-specific details.

### Routes

Files named `*.routes.ts` own Express routing, route-level middleware, authentication requirements, and Zod validation middleware. Routes call controllers and should not import repositories, external SDK clients, or password hashing libraries.

### Controllers

Files named `*.controller.ts` translate HTTP requests into service or use-case calls and translate results into HTTP responses. Controllers may handle HTTP-specific streaming details, such as Server-Sent Events, but the business decision-making still belongs in services or use cases.

Controllers must not:

- import `*.repository.ts`
- access `pool.query` or `pool.connect`
- hash or compare passwords directly
- instantiate external provider SDK clients

### Services and Use Cases

Services own ordinary domain workflows. Focused use-case classes own multi-step workflows that coordinate storage, AI, database writes, provider adapters, or background status.

Use cases are preferred when a workflow has one or more of these traits:

- it spans multiple repositories or infrastructure providers
- it has durable status, retries, leases, or idempotency concerns
- it is reused by manual upload and provider sync
- it needs narrow constructor-injected ports for tests

Examples:

- `IngestSourceFileUseCase` stores raw bytes, creates or updates source records, and starts processing.
- `GenerateSourceSummaryUseCase` extracts text, asks Gemini for source and Knowledge outputs, stores generated artifacts, and updates Knowledge metadata.
- `ScanGoogleDriveUseCase` leases a Drive connection, compares direct folder children against tracked files, and queues processing jobs.
- `ProcessGoogleDriveFileUseCase` downloads or exports one Drive file and feeds the shared source ingestion use case.

### Repositories

Files named `*.repository.ts` own SQL, transactions, PostgreSQL `Pool`/`Client` access, row locks, `FOR UPDATE SKIP LOCKED`, query filter construction, and row persistence.

Services and use cases pass typed filters and domain inputs to repositories. They must not assemble SQL fragments or access `database/pool` directly.

### Mappers

Files named `*.mapper.ts` translate persistence rows into API/domain shapes. PostgreSQL uses `snake_case`; API and frontend contracts use `camelCase`. Mappers also hide sensitive fields and persistence-only metadata.

### Infrastructure Adapters

Adapters own external SDKs and provider protocols. They translate provider concepts into narrow domain-facing methods.

Current adapters include:

- Gemini configuration in `backend/src/config/gemini.ts`
- Supabase storage service/repository infrastructure
- Google Drive OAuth and Drive v3 access in `backend/src/modules/google-drive/google-drive.adapter.ts`

External SDK objects should not leak into controllers or frontend-facing response contracts.

## Google Drive Integration Pattern

Google Drive is modeled as an account integration owned by the authenticated Knowlix `user_id`. The Google account email is display metadata only; it must never create, infer, merge, or replace the Knowlix user identity.

The current Drive contract is:

- OAuth uses read-only Drive access.
- OAuth state is random, hashed before persistence, single-use, expires after 10 minutes, and is tied to the authenticated Knowlix user.
- Refresh tokens are encrypted with AES-256-GCM before storage and are never returned to the frontend or logs.
- Folder selection is backend-owned. The frontend asks Knowlix for readable folders, then saves one selected folder through Knowlix APIs.
- Folder listing is restricted to folders in **My Drive** owned by the Google user.
- Sync imports supported files that are direct children of the selected folder. Subfolders are intentionally ignored.
- Durable tracking, modified-file detection, retry status, and leases live in PostgreSQL.
- Disconnect removes the Drive connection and tracking records. Existing Source of Truth and Knowledge records remain preserved.

The Drive worker must reuse source ingestion use cases. It should pass domain file input to `IngestSourceFileUseCase`; it must not fabricate Express or Multer objects.

## Gemini Proxy Pattern

Gemini calls go through `getGeminiClient()` in `backend/src/config/gemini.ts`. The client and `client.models` are wrapped with JavaScript `Proxy` objects so these methods receive automatic retry logging and backoff:

- `models.generateContent`
- `models.generateContentStream`
- `models.embedContent`

The wrapper retries transient SDK/API failures up to three attempts. JSON parsing, schema validation, and prompt-specific recovery remain the responsibility of the calling workflow.

SDK methods must not be monkey-patched directly.

## Frontend Boundary

Frontend data flow follows this shape:

```text
Page -> Hook -> Service -> Repository/API Client
```

Pages compose route-level UI. Feature components own domain-specific UI surfaces. Hooks manage React state and asynchronous lifecycle concerns. Services coordinate application workflows. Repositories and `apiClient` own persistence and HTTP details.

Frontend rules:

- Browser requests must go through `src/repositories/apiClient.ts` or a repository built on top of it.
- Feature components and hooks call services instead of building API URLs.
- API response types live next to the service or repository that consumes them.
- `VITE_API_URL` is centralized in `apiClient`.
- Cookie credentials are included by the API client, not repeated in feature code.
- IndexedDB fallback remains behind the library repository interface.

Google Drive UI must communicate that the user is connecting to Drive, but it must not expose tokens, OAuth state, raw provider errors, or provider-owned identity as Knowlix identity.

## API and Data Contracts

The backend and frontend must stay aligned on:

- request and response field names
- allowed file extensions and MIME variants
- pagination shape: `items`, `page`, `pageSize`, `total`
- status values such as source ingest status and Drive sync status
- error status codes and user-facing messages
- storage object ownership and preservation semantics

Database fields use `snake_case`. API responses use `camelCase`. Contract changes require updates to backend schemas/controllers, frontend services/repositories/types, and affected README files.

## Background Work and Durability

Manual source uploads may start background processing after the initial HTTP response. Provider integrations require durable tracking because they run outside the immediate user request.

Durable workers should:

- claim work through repository-owned leases or row locks
- record success, retryable failure, terminal failure, and next attempt times
- deduplicate by provider file id or stable source id
- reuse domain use cases instead of duplicating ingestion logic
- keep provider-specific metadata in integration tables or source metadata, not in frontend-only state

## Security and Ownership

All user data is scoped by Knowlix `user_id`.

Rules:

- Do not infer Knowlix identity from external provider email.
- Do not expose refresh tokens, password hashes, OAuth state hashes, or storage service credentials.
- Use bcrypt hashing only in auth/user services.
- Use HttpOnly cookies for sessions.
- Validate route bodies and query strings with Zod before controllers run.
- Keep raw files, extracted text, and generated Markdown owned by the authenticated user.

## Architecture Guard Tests

Backend guard tests live in `backend/test/architecture-boundaries.test.ts` and related module tests.

They currently enforce:

- database access stays inside repositories and database infrastructure
- controllers do not import repositories or password hashing
- Gemini retry behavior uses `Proxy` without mutating SDK methods

Use-case tests cover dependency injection and workflow behavior. Google Drive tests cover OAuth state ownership, direct-folder sync contracts, supported Drive formats, retry backoff, and read-only folder behavior.

Run:

```bash
cd backend
npm test
npm run build

cd ../frontend
npm run build
```

## Change Checklist

Before finishing a change, verify:

- new backend behavior respects `route -> controller -> service/use case -> repository/adapter`
- new frontend behavior respects `Page -> Hook -> Service -> Repository/API Client`
- persistence, provider, and storage logic are not hidden in controllers or UI components
- backend and frontend contracts match
- user-visible docs and workspace README files are updated
- tests/builds required by the changed workspaces pass
