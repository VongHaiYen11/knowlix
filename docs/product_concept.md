# Product Concept

Knowlix is a private knowledge workspace for turning user-owned source material into durable, searchable Knowledge.

The product is inspired by the LLM Wiki pattern: instead of treating every question as a fresh retrieval task over raw files, Knowlix keeps a maintained Knowledge layer between raw sources and research conversations. The local copy of the original idea file is preserved in [`llm-wiki.md`](llm-wiki.md).

## Core Model

Knowlix separates the workspace into three layers:

1. **Source of Truth**: raw uploaded documents, promoted notes, and synced Google Drive files. These are the inspectable materials the user trusts.
2. **Knowledge**: generated summaries, Markdown pages, tags, relationships, embeddings, and source links. These pages compound over time as new sources are ingested.
3. **Research**: chat threads and grounded answers over Knowledge, with numbered references back to retrieved Knowledge entries.

The user curates sources and asks questions. The system handles extraction, summarization, linking, search, and maintenance.

## Primary Workflows

### Ingest

A user uploads or syncs a supported document. Knowlix stores the raw source, extracts readable text, asks Gemini for a source summary and Knowledge actions, then creates or updates durable Knowledge pages.

### Research

A user asks a question. Knowlix retrieves relevant Knowledge, streams an answer, and includes references that point back to the Knowledge entries used.

### Maintain

The system can lint Knowledge for weak confidence, stale claims, orphaned pages, missing links, and contradictions. Maintenance work should improve the durable Knowledge layer rather than only improving a single answer.

## Product Principles

- Raw source material stays preserved.
- Generated Knowledge must remain grounded in source records.
- External provider identity is display metadata, not Knowlix identity.
- Durable Knowledge should become more useful after each ingest or research session.
- User-facing controls should make integrations, sync state, and source ownership understandable without exposing implementation details.

## Non-Goals

- Knowlix is not a public wiki.
- Knowlix is not a generic file drive replacement.
- Knowlix does not sync an entire Google Drive account.
- Knowlix does not let provider accounts create or merge Knowlix users.
