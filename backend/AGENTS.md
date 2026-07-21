# Backend Agent Guidelines

These rules describe the current Knowlix backend. Keep them grounded in the live codebase and update them when backend contracts change.

## Current Stack

- Node.js, Express, TypeScript ESM, Zod, `pg`, Multer, cookie-parser, CORS.
- PostgreSQL is accessed with raw SQL through `src/database/pool.ts`; there is no ORM.
- Gemini integration uses `@google/genai`; Supabase Storage is used for raw files and generated text/Markdown assets.
- Build command: `npm run build`.
- Test command: `npm test`.
- Migration command: `npm run db:migrate`.

## Application Shape

- `src/app.ts` mounts all API routers under `/api/v1` plus `/health`.
- Module folders follow the current pattern: `*.routes.ts`, `*.controller.ts`, `*.schemas.ts`, `*.service.ts`, and `*.repository.ts` when persistence is needed.
- Complex source workflows live in focused classes under `src/modules/sources/use-cases/`; inject narrow repository/storage/AI ports through constructors so use cases can be tested without live infrastructure.
- Use `requireAuth` for authenticated app routes.
- Use `validateBody()` and `validateQuery()` with Zod schemas at the routing layer. Preserve established redirect behavior when a browser-facing route needs custom invalid-input handling.
- Wrap async handlers with `asyncRoute()`.
- Let errors flow through `AppError`/global error middleware instead of hand-formatting unrelated response shapes.
- Keep controllers HTTP-focused. Controllers must not import repositories, issue SQL, hash/compare passwords, or own business workflows.

## Data and Persistence

- `backend/migrations/001_init.sql` is the fresh-schema baseline; apply later numbered migrations in order for existing databases.
- Keep SQL, repositories, Zod schemas, service inputs, route docs, and frontend types aligned when adding or removing fields.
- SQL, transaction management, Pool/Client access, and dynamic SQL filter construction belong only in `*.repository.ts` or `src/database/`. Services and use cases pass typed filter objects, never SQL fragments.
- Database records are mapped from `snake_case` to API `camelCase` in `*.mapper.ts`; do not hand-map database rows inside controllers or use cases.
- Scope user-owned rows by `user_id`; do not add cross-user queries unless the feature explicitly requires sharing.
- Knowledge slugs are user-scoped; do not assume global slug uniqueness.
- Store large Markdown/text assets in storage objects and keep relational rows focused on metadata, search vectors, references, and storage object ids.

## Upload and Ingest

- Supported uploads are PDF, DOCX, TXT, Markdown (`.md`, `.markdown`). Keep `sources.upload.ts`, frontend accept lists, source type unions, icons, and DB constraints synchronized.
- Upload ingest is app-facing through source upload/background processing; do not restore removed manual ingest CLI behavior.
- `IngestSourceFileUseCase` registers uploads and starts background work. `GenerateSourceSummaryUseCase` orchestrates extraction, Gemini calls, candidate context, generated assets, and completion status.
- `source-ingestion.repository.ts` owns ingestion SQL and transactions; `storage.repository.ts` owns storage-object metadata SQL. Keep Supabase byte transfer in `storageService`.
- Source of truth content should be preserved for display/audit. Do not truncate uploaded source text merely to control generated Knowledge length.
- Candidate Knowledge context may be budgeted for prompt size; uploaded source content and generated output policies are separate concerns.
- Ingest-time candidate retrieval and Research retrieval both query `knowledge_entries`, but they are different flows. Be explicit about which one a change touches.

## AI Prompt Contracts

- Prompt builders live under `src/prompts`.
- Protected rules belong in `systemInstruction`; source text, summaries, candidate content, and user customization values are untrusted dynamic `contents`.
- Ingest summary/pages calls use JSON response schemas in `src/wiki/ingest.ts`; keep prompt contracts, normalization, and persistence behavior aligned.
- Prompt wording alone is not the whole contract. Check `normalizeIngestSummary()`, `normalizeIngestPages()`, `GenerateSourceSummaryUseCase`, persistence repositories, and frontend consumers before changing allowed actions or JSON fields.
- Current ingest actions are `create`, `update`, `merge`, `replace`, `link_only`, and `skip`.
- For generated Knowledge length behavior: new `create` pages are bounded explanations; `update`/`merge`/`replace` prioritize preserving useful existing Knowledge over compression.
- The cost/token estimator API and UI have been removed. Do not reintroduce pricing metadata, `/estimate-cost`, or frontend estimator surfaces without an explicit product decision.
- Gemini retries are implemented with transparent JavaScript `Proxy` wrappers in `src/config/gemini.ts`. Do not mutate SDK methods directly. SDK/API failures may be retried there; JSON parsing or domain validation after a response remains the caller's responsibility.

## Research and Knowledge

- Research threads and messages are persisted in PostgreSQL via `/api/v1/research/threads`.
- Research answers stream from `/api/v1/research/messages` and should keep numbered references aligned with retrieved Knowledge.
- Research summaries are thread-scoped and should remain on `research_threads`; do not create Knowledge or Library artifacts for them.
- Knowledge Markdown is commonly read through `markdown_storage_object_id`; preserve storage references when updating Knowledge.
- Merge behavior must preserve useful content, update links/revisions consistently, and avoid orphaning related references.

## Documentation and Verification

- Treat documentation updates as part of implementation, not optional cleanup.
- Update `backend/README.md` whenever backend routes, request/response contracts, status/error behavior, schema/migrations, environment variables, scripts, architecture, internal modules named by the README, ingest/research flow, or storage behavior changes.
- Update the root `README.md` when a backend change affects top-level capabilities, setup, stack, or cross-stack workflow.
- If a backend change affects frontend-visible behavior, update frontend services/types/docs in the same sweep.
- Update `frontend/README.md` for any affected frontend route, API integration, or user-visible behavior, and update `frontend/AGENTS.md` when a durable frontend convention changes.
- Update `../docs/architecture_design_pattern.md` whenever a pattern or layer boundary changes.
- Before finishing, search all README/AGENTS files for stale names, removed options, deprecated models, and obsolete commands related to the change.
- Run `npm test` and `npm run build` in `backend/` after backend TypeScript or architecture changes.
- For full-stack contract changes, also run the frontend build after updating frontend code.
