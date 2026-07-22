<div align="center">

# 🔖 Knowlix

**AI-powered personal knowledge workspace for turning documents into searchable, grounded Knowledge.**

<br />

<strong>Source of Truth</strong> → <strong>LLM-maintained Knowledge</strong> → <strong>Grounded Research</strong>

<br />

<p>
  <a href="#-overview">🌱 Overview</a> •
  <a href="#-what-makes-knowlix-different">✨ Difference</a> •
  <a href="#-features">🧰 Features</a> •
  <a href="#-architecture">🏗️ Architecture</a> •
  <a href="#-workflow">🔄 Workflow</a> •
  <a href="#-getting-started">🚀 Start</a> •
  <a href="#-documentation">📚 Docs</a>
</p>

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white">
</p>

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img alt="Google Gemini" src="https://img.shields.io/badge/AI-Google%20Gemini-FBBC04?style=for-the-badge&logo=google&logoColor=111827">
  <img alt="Supabase Storage" src="https://img.shields.io/badge/Storage-Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=111827">
  <img alt="Google Drive" src="https://img.shields.io/badge/Sync-Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white">
</p>

</div>

---

## 🌱 Overview

Knowlix helps researchers, students, and professionals upload source documents, extract durable knowledge, and search across a private knowledge base. 

Knowlix is inspired by Andrej Karpathy's LLM Wiki idea: raw sources stay preserved while an LLM incrementally maintains a durable, interlinked Knowledge layer. The local idea file is kept in [`docs/llm-wiki.md`](docs/llm-wiki.md).

> Related references:
> - [Karpathy Wiki Guide](https://karpathy-wiki.lol/en/wiki/llm-wiki-guide)
> - [Karpathy's LLM Wiki Pattern](https://ronancodes.github.io/llm-wiki/docs/research/karpathy/).

## ✨ What Makes Knowlix Different

What Knowlix clarifies or extends beyond the original idea:

- **Productized web app instead of local-agent workflow:** the LLM Wiki idea is described as a markdown/wiki pattern; Knowlix turns it into an authenticated React + Express application with routes, settings, and persistent user accounts.
- **Database-backed Knowledge layer:** Knowlix stores Knowledge metadata, source links, vectors, research threads, and ownership in PostgreSQL instead of relying only on a folder of markdown files.
- **Hybrid retrieval for research:** Knowlix combines durable Knowledge pages with `pgvector` semantic search and full-text retrieval for grounded research answers.
- **Source preservation and generated artifacts:** raw files, extracted text, source summaries, and generated Markdown are stored separately so users can inspect the original Source of Truth and the AI-maintained Knowledge layer.
- **Provider sync workflow:** Knowlix adds read-only Google Drive folder sync, durable file tracking, retry leases, and direct-child folder import behavior.
- **Multi-user security model:** Knowlix scopes all sources, Knowledge, integrations, and research threads by authenticated `user_id`; external provider email is display metadata, not identity.
- **Operational architecture:** Knowlix defines explicit route/controller/service/use-case/repository boundaries, architecture guard tests, encrypted tokens, migrations, and build/test workflows.
- **Configurable AI behavior:** Knowlix exposes prompt/model/temperature customization for ingestion and research instead of treating the LLM maintainer behavior as only a local schema file.

The root README is the project landing page. Detailed implementation notes live in [`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md).

## 🧭 Quick Compass

| Need | Start Here |
| --- | --- |
| 🧠 Understand the product idea | [`docs/product_concept.md`](docs/product_concept.md) |
| 🏗️ Review architecture boundaries | [`docs/architecture_design_pattern.md`](docs/architecture_design_pattern.md) |
| ☁️ Configure Google Drive sync | [`docs/google_drive_integration.md`](docs/google_drive_integration.md) |
| 🧪 Run checks locally | [`docs/development_workflow.md`](docs/development_workflow.md) |
| 📝 Read the original LLM Wiki idea | [`docs/llm-wiki.md`](docs/llm-wiki.md) |

## 🧰 Features

| Area | What Knowlix Does |
| --- | --- |
| 📥 **Document ingestion** | Upload PDF, DOCX, TXT, and Markdown sources for AI-assisted processing. |
| ☁️ **Google Drive sync** | Grant Knowlix access to one picked Drive folder per account, import direct child files every 6 hours, or run Sync now. |
| 🗃️ **Source of Truth** | Store raw uploads and extracted text so users can inspect the original material. |
| 🧩 **Knowledge generation** | Generate grounded source summaries and durable Knowledge pages from uploaded material. |
| 🎛️ **AI customization** | Tune ingest prompts, research behavior, model choice, and temperature. |
| 🔎 **Semantic search** | Use Gemini embeddings and `pgvector` to retrieve relevant Knowledge. |
| 💬 **Research workspace** | Ask grounded questions against retrieved Knowledge with numbered references. |
| 📖 **Markdown reading** | Render rich Markdown with math and diagrams through KaTeX and Mermaid support. |
| 🔐 **Authentication** | Protect user data with cookie-based JWT sessions and bcrypt password hashing. |
| 📧 **Email verification** | Secure registration flows verifying user email addresses before account activation via SMTP. |
| 🛡️ **Secure account flows** | Dedicated Forgot/Reset Password flows, plus password-locked email modification safety dialogs. |
| ♻️ **Robust AI pipeline** | Automatic retry handlers protect Gemini generation, streaming, and embedding calls. |
| 📚 **Paginated lists** | Fluid pagination controls in library tabs and research history. |
| ✒️ **Serif typography** | Global Lora typeface for rich, diacritic-safe Vietnamese text rendering. |

## 🏗️ Architecture

```text
React + Vite frontend
        |
        v
Node.js / Express API
        |
        +--> Google Gemini API        # summaries, Knowledge extraction, research answers, embeddings
        +--> Google Drive API         # read-only folder polling and source imports
        +--> Supabase Storage         # raw files, extracted text, generated markdown
        +--> PostgreSQL + pgvector    # users, sources, Knowledge metadata, vectors, research threads
```

Backend code follows route -> controller -> service/use case -> repository boundaries. SQL and transactions remain inside repositories, while mappers isolate database records from API response shapes. See [`docs/architecture_design_pattern.md`](docs/architecture_design_pattern.md) for the enforced design rules.

### Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, React Markdown |
| Backend | Node.js, Express, TypeScript, Zod, Multer, Google APIs |
| Database | PostgreSQL, `pgvector`, raw SQL migrations |
| AI | Google Gemini via `@google/genai` |
| Storage | Supabase Storage |
| Parsing | `pdf-parse`, `mammoth` |
| Auth | JWT cookies, bcryptjs |

## 🔄 Workflow

1. **Upload** a supported document from the React app.
2. **Store** the raw source in Supabase Storage and metadata in PostgreSQL.
3. **Extract** readable text from PDF, DOCX, TXT, or Markdown.
4. **Summarize** the source and plan durable Knowledge candidates with Gemini.
5. **Generate** Knowledge pages, update existing pages, merge when appropriate, or link-only when the source adds no new durable detail.
6. **Embed** Knowledge metadata/content for semantic retrieval with `pgvector`.
7. **Research** by asking questions over retrieved Knowledge with grounded references.

Google Drive follows the same ingestion pipeline. An authenticated Knowlix user connects Drive with read-only Drive access, chooses one folder, and a leased worker imports supported direct children every six hours. Subfolders are ignored; modified files update their existing source and removed files remain preserved in Knowlix.

## 🗂️ Project Structure

```text
knowlix/
├── backend/       # Express API, ingest orchestration, migrations, storage, AI integrations
├── docs/          # Additional technical documentation
├── frontend/      # React 19 SPA built with Vite
└── scripts/       # Project utilities
```

## 🚀 Getting Started

### 1. Clone

```bash
git clone <repository-url>
cd knowlix
```

### 2. Install

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 3. Configure Environment

```bash
cd frontend
cp .env.example .env

cd ../backend
cp .env.example .env
```

Fill the backend `.env` with the required Gemini and Supabase values:

```text
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

For Drive sync, also create a Google OAuth web client, register the backend callback URL, enable Drive API access for the project, and configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`, and a 32-byte `GOOGLE_TOKEN_ENCRYPTION_KEY`. Drive OAuth is separate from Knowlix email/password authentication.

### 4. Start Database

```bash
cd backend
docker-compose up -d
npm run db:migrate
```

### 5. Run Development Servers

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

## 📚 Documentation

| Document | Purpose |
| --- | --- |
| [`frontend/README.md`](frontend/README.md) | Frontend routes, UI behavior, local development, and rendering stack. |
| [`backend/README.md`](backend/README.md) | API routes, database schema, ingest pipeline, research flow, storage, and AI customization. |
| [`docs/architecture_design_pattern.md`](docs/architecture_design_pattern.md) | Architecture boundaries, product layers, integration patterns, and guard tests. |
| [`docs/product_concept.md`](docs/product_concept.md) | Product model, LLM Wiki mapping, core workflows, and non-goals. |
| [`docs/google_drive_integration.md`](docs/google_drive_integration.md) | Google Drive OAuth setup, sync behavior, security model, and troubleshooting. |
| [`docs/development_workflow.md`](docs/development_workflow.md) | Local setup, verification commands, architecture review, and documentation checklist. |
| [`docs/llm-wiki.md`](docs/llm-wiki.md) | Preserved source idea file for the LLM Wiki pattern that inspired Knowlix. |

## 🎨 Design Notes

- **LLM Wiki-inspired layering** keeps raw Source of Truth records separate from generated Knowledge and research conversations.
- **PostgreSQL + pgvector** keeps relational metadata and vector search in one database.
- **Supabase Storage** stores large file and Markdown assets outside relational rows.
- **Gemini** powers source summarization, Knowledge extraction, grounded research answers, and embeddings.
- **Root docs stay concise** so backend and frontend implementation details can evolve in their own READMEs.

## 🛣️ Roadmap Ideas

- OCR support for image-based documents.
- Collaboration and sharing workflows.
- More analytics around real AI usage and processing reliability.
- Expanded Knowledge maintenance and quality checks.
