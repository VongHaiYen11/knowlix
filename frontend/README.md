<div align="center">

# 🧠 Knowlix — Frontend

**Local-first research and personal knowledge workspace**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061a23)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38BDF8?logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-5E7D63)
![Local First](https://img.shields.io/badge/Data-local--first-D8EADB)
![Markdown](https://img.shields.io/badge/Markdown-Math_+_Mermaid-2D2A26?logo=markdown&logoColor=white)

</div>

Knowlix is a local-first personal knowledge management frontend for capturing source material, organizing it into a searchable library, transforming sources into structured knowledge pages, and asking grounded research questions across a private knowledge base.

It is designed for readers, researchers, students, writers, and knowledge workers who want one workspace for notes, PDFs, articles, bookmarks, files, voice captures, and generated knowledge summaries. The application includes a source-of-truth library, editable knowledge article viewers, markdown editing with live preview, math and Mermaid rendering, scoped research chat with evidence controls, chat history, journal views, and an interactive knowledge graph. Data is stored locally with IndexedDB and localStorage, making the current frontend usable without a backend service.

## Features

- Home dashboard with semantic search entry points and reading suggestions.
- Library for source-of-truth items and generated knowledge pages, with scalable filter and sort tools.
- Research workspace with scoped knowledge filters, collapsible evidence panel, chat history, and editable chat names.
- Source-of-truth viewer pages with editable content, source metadata, and user-managed tags.
- Knowledge article pages with explanations, examples, references, related pages, edit mode, math rendering, and Mermaid diagram support.
- Markdown editor with resizable split preview, math, Mermaid, tables, links, lists, and heading controls.
- Journal, graph, settings, responsive layouts, and light/dark theme support.

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 4 with CSS variables and theme tokens
- **Icons:** lucide-react
- **Content rendering:** react-markdown, remark-gfm, remark-math, rehype-katex, KaTeX, Mermaid
- **State/data:** React hooks, localStorage for UI/chat state, IndexedDB repository layer for app data
- **Build tool:** Vite
- **Testing:** No test runner is configured yet

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
git clone <your-repo-url>
cd knowlix/frontend
npm install
```

### Environment Variables

No environment variables are required for the current local-first frontend.

If backend APIs are added later, create `.env.local` with values only:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

For backend/API expectations, see [be-description.md](./be-description.md).

### Run Locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Project Structure

```text
src/
├── components/      # Reusable UI, shared layout, and common page pieces
├── constants/       # Routes, app constants, and seed data
├── features/        # Domain-specific UI sections
├── hooks/           # Async, library, research, editor, and theme hooks
├── pages/           # Route-level views
├── repositories/    # IndexedDB client and repository interfaces
├── services/        # Business logic and future API boundary
├── theme/           # Color, spacing, typography, radius, and shadow tokens
├── types/           # Shared TypeScript interfaces
├── utils/           # Framework-agnostic helpers
├── App.tsx          # Route table
└── main.tsx         # App entry point
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on `127.0.0.1` |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Design / Style Guide

- Theme tokens live in `src/theme`.
- Runtime CSS variables live in `src/index.css`.
- Reusable primitives belong in `src/components/ui`.
- Shared page/layout pieces belong in `src/components/common` and `src/components/layout`.
- Feature-only UI belongs under `src/features/<domain>`.

## Data Model

The frontend is local-first. The main data path is:

```text
UI -> hook -> service -> repository -> IndexedDB
```

IndexedDB stores are declared in `src/repositories/indexedDbClient.ts`:

- `knowledge`
- `sources`
- `notes`
- `journal`
- `graphNodes`
- `graphLinks`

The first app load seeds IndexedDB from `src/constants/sampleData.ts`.

Research chat threads and theme preference are persisted with `localStorage`.

## Current Routes

| Route | Description |
|---|---|
| `/` | Home dashboard |
| `/library` | Source of Truth and Knowledge library |
| `/library/source/:id` | Source viewer |
| `/library/source/:id/edit` | Source markdown editor |
| `/library/knowledge/:slug` | Knowledge article viewer |
| `/library/knowledge/:slug/edit` | Knowledge markdown editor |
| `/library/note/:id` | Note editor, including `new` |
| `/research` | Research chat workspace |
| `/graph` | Knowledge graph |
| `/journal` | Journal |
| `/settings` | Settings |

## Related

This package is the frontend for Knowlix. It currently ships without backend, server, API, or database code. See [be-description.md](./be-description.md) for the backend contract and migration notes.

## License

No license is declared.
