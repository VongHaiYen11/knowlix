# Backend Agent Guidelines

These rules describe the current Knowlix backend. Keep them grounded in the live codebase and update them when backend contracts change.

## Current Stack

- Node.js, Express, TypeScript ESM, Zod, `pg`, Multer, cookie-parser, CORS.
- PostgreSQL is accessed with raw SQL through `src/database/pool.ts`; there is no ORM.
- Gemini integration uses `@google/genai`; Supabase Storage is used for raw files and generated text/Markdown assets.
- Build command: `npm run build`.
- Migration command: `npm run db:migrate`.

## Application Shape

- `src/app.ts` mounts all API routers under `/api/v1` plus `/health`.
- Module folders follow the current pattern: `*.routes.ts`, `*.controller.ts`, `*.schemas.ts`, `*.service.ts`, and `*.repository.ts` when persistence is needed.
- Use `requireAuth` for authenticated app routes.
- Use `validateBody()` with Zod schemas for JSON request bodies.
- Wrap async handlers with `asyncRoute()`.
- Let errors flow through `AppError`/global error middleware instead of hand-formatting unrelated response shapes.

## Data and Persistence

- `backend/migrations/001_init.sql` is the canonical schema source for the current database shape.
- Keep SQL, repositories, Zod schemas, service inputs, route docs, and frontend types aligned when adding or removing fields.
- Scope user-owned rows by `user_id`; do not add cross-user queries unless the feature explicitly requires sharing.
- Knowledge slugs are user-scoped; do not assume global slug uniqueness.
- Store large Markdown/text assets in storage objects and keep relational rows focused on metadata, search vectors, references, and storage object ids.

## Upload and Ingest

- Supported uploads are PDF, DOCX, TXT, Markdown (`.md`, `.markdown`). Keep `sources.upload.ts`, frontend accept lists, source type unions, icons, and DB constraints synchronized.
- Upload ingest is app-facing through source upload/background processing; do not restore removed manual ingest CLI behavior.
- `sources.ingest-service.ts` orchestrates raw download, extraction, summary generation, candidate retrieval, page extraction, storage uploads, DB writes, revisions, source links, and final status updates.
- Source of truth content should be preserved for display/audit. Do not truncate uploaded source text merely to control generated Knowledge length.
- Candidate Knowledge context may be budgeted for prompt size; uploaded source content and generated output policies are separate concerns.
- Ingest-time candidate retrieval and Research retrieval both query `knowledge_entries`, but they are different flows. Be explicit about which one a change touches.

## AI Prompt Contracts

- Prompt builders live under `src/prompts`.
- Protected rules belong in `systemInstruction`; source text, summaries, candidate content, and user customization values are untrusted dynamic `contents`.
- Ingest summary/pages calls use JSON response schemas in `src/wiki/ingest.ts`; keep prompt contracts, normalization, and persistence behavior aligned.
- Prompt wording alone is not the whole contract. Check `normalizeIngestSummary()`, `normalizeIngestPages()`, and `sources.ingest-service.ts` before changing allowed actions or JSON fields.
- Current ingest actions are `create`, `update`, `merge`, `replace`, `link_only`, and `skip`.
- For generated Knowledge length behavior: new `create` pages are bounded explanations; `update`/`merge`/`replace` prioritize preserving useful existing Knowledge over compression.
- The cost/token estimator API and UI have been removed. Do not reintroduce pricing metadata, `/estimate-cost`, or frontend estimator surfaces without an explicit product decision.

## Research and Knowledge

- Research threads and messages are persisted in PostgreSQL via `/api/v1/research/threads`.
- Research answers stream from `/api/v1/research/messages` and should keep numbered references aligned with retrieved Knowledge.
- Research summaries are thread-scoped and should remain on `research_threads`; do not create Knowledge or Library artifacts for them.
- Knowledge Markdown is commonly read through `markdown_storage_object_id`; preserve storage references when updating Knowledge.
- Merge behavior must preserve useful content, update links/revisions consistently, and avoid orphaning related references.

## Documentation and Verification

- Keep `backend/README.md` aligned with real routes, schema, ingest flow, storage behavior, and API contracts.
- If a backend change affects frontend-visible behavior, update frontend services/types/docs in the same sweep.
- Run `npm run build` in `backend/` after TypeScript changes.
- For full-stack contract changes, also run the frontend build after updating frontend code.
