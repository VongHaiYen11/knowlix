# Research Wiki: Knowlix

## Project Structure

- `raw/` - Immutable source documents saved by upload APIs. Never modify files here.
- `raw/papers/` - Papers, long-form articles, transcripts, exports, and source notes.
- `raw/uploads/` - Files received from `POST /api/v1/sources/upload`.
- `wiki/` - LLM-generated and maintained markdown pages.
- `wiki/sources/` - Source summaries generated from files in `raw/`.
- `wiki/index.md` - Master content catalog. Update on every ingest operation.
- `wiki/log.md` - Append-only operation log.
- `outputs/` - Generated reports, lint results, exports, and review artifacts.
- `scripts/gemini-ingest.ts` - Gemini-powered ingest workflow.
- PostgreSQL - Persistent app database for Source of Truth, Knowledge, and Graph.

## Page Types and Conventions

Every wiki page must have YAML frontmatter:

    ---
    title: Page Title
    type: concept | entity | source-summary | comparison
    sources:
      - raw/papers/filename.md
    related:
      - "[[related-concept]]"
    created: YYYY-MM-DD
    updated: YYYY-MM-DD
    confidence: high | medium | low
    ---

### Naming

- Filenames: kebab-case matching the concept, such as `attention-mechanism.md`.
- Source summary filenames: kebab-case matching the source name in `wiki/sources/`.
- Cross-references: use `[[wikilinks]]` for all internal links.
- Source references: always link back to `raw/` file paths.
- Keep markdown pages readable without the app or database.

## Gemini API Setup

The ingest workflow uses the Gemini API to turn files from `raw/` into markdown pages.

Add these values to `backend/.env`:

    GEMINI_API_KEY=your_gemini_api_key_here
    GEMINI_MODEL=gemini-2.5-flash

Upload-triggered ingest:

    POST /api/v1/sources/upload

The API saves the uploaded file into `raw/uploads/YYYY-MM-DD/`, reads `GEMINI.md`, sends the source to Gemini, writes markdown pages into `wiki/`, and persists Source of Truth, Knowledge, and Graph records to PostgreSQL.

Manual ingest:

    cd backend
    npm run wiki:ingest -- ../raw/papers/example.md

Run all supported raw files:

    cd backend
    npm run wiki:ingest

Supported source file extensions:

- `.md`
- `.txt`
- `.json`
- `.csv`

## Workflows

### Ingest

1. Receive a file through `POST /api/v1/sources/upload`.
2. Save the immutable original into `raw/uploads/YYYY-MM-DD/`.
3. Read this `GEMINI.md` guideline.
4. Use Gemini to extract key takeaways, concepts, entities, comparisons, and source-backed claims.
5. Create `wiki/sources/[source-name].md` summary.
6. Update or create concept/entity/comparison pages as needed.
7. Save a Source of Truth record in PostgreSQL `sources`.
8. Upsert related Knowledge records in PostgreSQL `knowledge_entries`.
9. Upsert Graph nodes and links in PostgreSQL `graph_nodes` and `graph_links`.
10. Update `wiki/index.md` with new entries.
11. Append the operation to `wiki/log.md`.

### Query

1. Read `wiki/index.md` to identify relevant pages.
2. Read those pages and synthesize an answer.
3. Cite sources using `[[wikilinks]]`.
4. Link back to raw source paths when making source-backed claims.
5. If the answer is novel and valuable, offer to save it as a new wiki page.

### Lint

1. Scan all wiki pages for contradictions.
2. Identify orphan pages with no incoming links.
3. Flag missing concepts referenced by `[[wikilinks]]` but not created.
4. Find stale claims superseded by newer sources.
5. Save results to `outputs/lint-YYYY-MM-DD.md`.

## Editing Rules

- Never modify files inside `raw/`.
- Uploaded files must be copied into `raw/uploads/` before Gemini ingest starts.
- Every successful upload should create or update database records for Source of Truth, Knowledge, and Graph.
- Never delete wiki pages during ingest.
- Preserve existing user-written content when updating a page.
- Prefer appending an "Updated from source" section over replacing a whole page.
- Keep `wiki/log.md` append-only.
- If Gemini output is uncertain, mark `confidence: low` and state what is missing.
- If a page already exists, merge carefully and update `updated`.
- Do not invent source paths. Every source reference must point to a real file in `raw/`.
