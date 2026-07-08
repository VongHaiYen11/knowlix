# Backend Description

This file describes the backend needed to replace the current IndexedDB repository. The frontend is local-first for now and expects the backend to preserve these entity shapes.

## Authentication

Authentication is recommended before production release. Use bearer tokens or secure cookie sessions. Every endpoint below should require an authenticated user and scope all records to that user. Public sharing can be added later as a separate permission model.

## Entities

### KnowledgeEntry

A generated or user-edited knowledge page.

- `slug`: unique page identifier
- `title`, `overview`, `category`, `tags`
- `created`, `updated`, `readTime`
- `keyIdeas`, `explanation`, `examples`
- `related`: linked knowledge pages
- `references`: citation labels and source names
- `sources`: source materials used to create the page
- `timeline`: audit trail of page updates

### Source

Raw source material captured by the user.

- Types: `Note`, `PDF`, `Article`, `Bookmark`, `Image`, `Voice`, `File`
- Status values: `Queued`, `Processing`, `Processed`
- Belongs to one user and can feed many knowledge entries.

### Note

Markdown document edited by the user. Notes can be sources and can later become knowledge pages.

### JournalDay

Daily group of standalone journal notes captured by date.

## API List

### GET `/api/v1/me`

Purpose: Return authenticated user profile.

Response `200`:

```json
{ "id": "user_123", "name": "Eleanor Vale", "initials": "EV" }
```

Errors: `401` if unauthenticated.

### GET `/api/v1/knowledge`

Purpose: List knowledge pages.

Query: `q`, `category`, `tags`, `page`, `pageSize`.

Response `200`:

```txt
data: {"references":[{"number":1,"id":"source-id","type":"PDF","title":"Source title"}]}
data: {"text":"..."}
data: [DONE]
```

The UI shows references saved from the bracketed citations in completed assistant messages for the current chat.

```json
{ "items": [], "page": 1, "pageSize": 10, "total": 0 }
```

Validation: `page >= 1`, `pageSize <= 100`, tags must be strings.

### GET `/api/v1/knowledge/:slug`

Purpose: Return one knowledge page.

Response `200`: `KnowledgeEntry`.

Errors: `404` when missing.

### POST `/api/v1/knowledge`

Purpose: Create a knowledge page manually or from selected sources.

Request: `title`, `overview`, `category`, `tags`, optional `sourceIds`.

Response: `201` with created `KnowledgeEntry`.

Validation: title required, category required, tags unique.

### PATCH `/api/v1/knowledge/:slug`

Purpose: Update a knowledge page.

Request: partial `KnowledgeEntry` editable fields.

Response: `200` with updated page.

Errors: `400` invalid payload, `404` missing page, `409` slug conflict.

### DELETE `/api/v1/knowledge/:slug`

Purpose: Delete a knowledge page.

Response: `204`.

### GET `/api/v1/sources`

Purpose: List source materials.

Query: `q`, `type`, `status`, `category`, `page`, `pageSize`.

Response: paginated `Source[]`.

### POST `/api/v1/sources`

Purpose: Create a source record from text, URL, metadata, or uploaded file reference.

Request: `type`, `title`, `tags`, `category`, `content` or `fileId`.

Response: `201` with `Source`.

Validation: type/status enums, title required, file required for binary source types.

### POST `/api/v1/sources/upload`

Purpose: Accept file upload and return file metadata.

Request: multipart file.

Response `201`:

```json
{ "fileId": "file_123", "name": "paper.pdf", "mimeType": "application/pdf", "size": 12345 }
```

Expected statuses: `201`, `400`, `413`, `415`.

### PATCH `/api/v1/sources/:id`

Purpose: Update source metadata or processing status.

Response: `200` with updated `Source`.

### DELETE `/api/v1/sources/:id`

Purpose: Delete source material.

Response: `204`.

### GET `/api/v1/notes`

Purpose: List markdown notes.

Response: paginated `Note[]`.

### GET `/api/v1/notes/:id`

Purpose: Read one note.

Response: full note with markdown `content`.

### POST `/api/v1/notes`

Purpose: Create note.

Request: `title`, `content`, optional `tags`.

Response: `201` with `Note`.

### PATCH `/api/v1/notes/:id`

Purpose: Autosave note content and metadata.

Response: `200` with saved `Note`.

Validation: content max size should be enforced.

### DELETE `/api/v1/notes/:id`

Purpose: Delete a note.

Response: `204`.

### GET `/api/v1/journal`

Purpose: List journal note days.

Query: `from`, `to`, `page`, `pageSize`.

Response: paginated `JournalDay[]`.

### POST `/api/v1/journal/:date/entries`

Purpose: Add a journal note to a day.

Request: `time`, `text`, optional `tags`.

Response: `201` with updated `JournalDay`.

### POST `/api/v1/research/messages`

Purpose: Ask a grounded question across all knowledge. `scope` is accepted for thread UI state but does not tune answer retrieval.

Request:

```json
{
  "question": "What do I know about memory?",
  "scope": { "tags": [], "categories": [], "dateRange": "Anytime" }
}
```

Response `200`:

```json
{
  "answer": "Grounded synthesis...",
  "evidence": [{ "slug": "spaced-repetition", "title": "Spaced Repetition" }],
  "actions": ["Save as Knowledge", "Create Note", "Update Existing", "Merge with Page"]
}
```

Expected statuses: `200`, `400`, `401`, `429`, `500`.

## Error Format

All errors should return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Use stable error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Suggested API Flow

1. Frontend authenticates and calls `/me`.
2. Home loads `/knowledge`, `/notes`, and `/journal`.
3. Library searches `/sources` or `/knowledge` depending on active tab.
4. Note editor loads `/notes/:id` and autosaves with `PATCH /notes/:id`.
5. Research sends the question to `/research/messages`, saves cited references on each assistant message, then filters visible references inside the current chat panel.

## Relationships

- User has many knowledge entries, sources, notes, and journal days.
- Knowledge entries have many source references.
- Knowledge entries relate to other knowledge entries by slug.
- Notes may also appear as sources.
