<div align="center">

# 🧠 Knowlix Frontend

**A private knowledge workspace for sources, notes, research chat, and journal capture.**

<br />

<strong>Library</strong> · <strong>Research</strong> · <strong>Journal</strong> · <strong>Settings</strong> · <strong>Drive Folder Picker</strong>

<br />

<p>
  <a href="#-features">✨ Features</a> •
  <a href="#-project-structure">🗂️ Structure</a> •
  <a href="#-routing">🧭 Routes</a> •
  <a href="#-architecture">🏗️ Architecture</a> •
  <a href="#-api-integration">📡 API</a> •
  <a href="#-available-scripts">📜 Scripts</a>
</p>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=061a23)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-GFM_%2B_Math_%2B_Mermaid-2D2A26?style=for-the-badge&logo=markdown&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-5E7D63?style=for-the-badge)

</div>

## ✨ Features

- 🔐 Authentication screens for login and signup, with protected app routes.
- 🏠 Home dashboard with greeting, search entry point, recent notes, reading cards, daily inspiration, and latest journal note.
- 📚 Library with Source of Truth, Knowledge, and Notes tabs.
- 📄 Source viewer with upload support for PDF, DOCX, TXT, Markdown, editable tags, and DOCX preview support.
- 🧠 Knowledge article viewer with Markdown rendering, source materials, timeline, related knowledge, and edit route.
- 📝 Note editor with split Markdown preview, explicit save/cancel controls, and “Add as source of truth”.
- 🔎 Research workspace with chat history, cited Knowledge references, filters, and collapsible side panels.
- 📓 Journal page for dated quick notes with optional tags.
- 🎛️ Customization tab for Knowledge ingestion prompts, research behavior, model choice, and temperature.
- ⚙️ Settings for account profile, password, theme, and Google Drive folder integration.
- 🌗 Light/dark theme support.
- 🇻🇳 Vietnam-time date helpers for user-facing daily behavior.

## 🖼️ Experience Map

| Surface | What the UI Does | Key Code |
|---|---|---|
| 🏠 Home | Greeting, search entry, reading cards, inspiration, journal preview | `pages/HomePage.tsx`, `features/home/*` |
| 📚 Library | Source of Truth, Knowledge, Notes, upload, pagination, filters | `pages/LibraryPage.tsx`, `features/library/*` |
| 📖 Reader | Source and Knowledge article rendering with markdown/math/diagrams | `pages/SourceArticlePage.tsx`, `pages/KnowledgeArticlePage.tsx` |
| 💬 Research | Chat, streaming answers, references, history, summaries | `pages/ResearchPage.tsx`, `features/research/*` |
| 📝 Notes & journal | Markdown note editor, note promotion, dated journal capture | `pages/NoteEditorPage.tsx`, `pages/JournalPage.tsx` |
| ☁️ Settings / Drive | Account settings, theme, Drive connect, hierarchical folder picker | `pages/SettingsPage.tsx`, `features/settings/*` |

## 🛠 Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=061a23)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Lucide](https://img.shields.io/badge/Icons-lucide--react-5E7D63?style=flat-square)
![KaTeX](https://img.shields.io/badge/Math-KaTeX-2D2A26?style=flat-square)
![Mermaid](https://img.shields.io/badge/Diagrams-Mermaid-ff3670?style=flat-square)

- **Framework:** React
- **Language:** TypeScript
- **Build tool:** Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS with CSS variables
- **Icons:** lucide-react
- **Markdown:** react-markdown, remark-gfm, remark-math, rehype-katex
- **Diagrams:** Mermaid
- **Local storage:** IndexedDB and localStorage

## 📁 Project Structure

```text
frontend/
├── public/                 # Static public assets
├── src/
│   ├── auth/               # Auth provider, auth service, and auth types
│   ├── assets/             # App illustration assets
│   ├── components/         # Shared UI, layout, and common page components
│   ├── constants/          # App constants and route builders
│   ├── features/           # Feature-specific UI modules
│   ├── hooks/              # Reusable React hooks
│   ├── pages/              # Route-level pages
│   ├── repositories/       # API and IndexedDB repository implementations
│   ├── services/           # App-level data and business logic
│   ├── theme/              # Design token modules
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Utility helpers
│   ├── App.tsx             # Route table
│   ├── index.css           # Tailwind, theme variables, and global styles
│   └── main.tsx            # React entry point
├── index.html
├── vite.config.ts
└── package.json
```

## ⚙️ Getting Started

```bash
npm install
npm run dev
```

The dev server is configured through Vite with:

```bash
vite --host 127.0.0.1
```

## 🔐 Environment Variables

The frontend reads one Vite environment variable:

| Variable | Default | Used for |
|---|---|---|
| `VITE_API_URL` | `http://127.0.0.1:4000` | Backend API base URL |

Example from `.env.example`:

```bash
VITE_API_URL=http://127.0.0.1:4000
```

## 🧭 Routing

Routes are defined in `src/App.tsx` and `src/constants/routes.ts`.

| Route | Page |
|---|---|
| `/` | Home |
| `/login` | Login |
| `/signup` | Signup |
| `/library` | Library |
| `/library/source/:id` | Source article |
| `/library/source/:id/edit` | Source editor |
| `/library/knowledge/:slug` | Knowledge article |
| `/library/knowledge/:slug/edit` | Knowledge editor |
| `/library/note/:id` | Note editor |
| `/research` | Research workspace |
| `/customization` | AI customization |
| `/journal` | Journal |
| `/settings` | Settings |

Authenticated routes are wrapped by `AppShell`; unauthenticated users are redirected to `/login`.

## 🧩 Architecture

- **Pages** own route-level composition.
- **Features** group domain UI such as library cards, research panels, editor tools, and home sections.
- **Components** provide reusable layout and UI primitives.
- **Hooks** manage shared state and async loading patterns.
- **Services** coordinate app workflows such as library operations, note saving, journal creation, source upload, and research.
- **Repositories** separate backend API access from IndexedDB fallback storage.
- **AuthProvider** centralizes session state, login, signup, logout, and profile updates.

Data access follows this shape:

```text
Page / Feature -> Hook or Service -> Repository / API Client -> API or IndexedDB
```

### 🧱 Frontend Boundary Compass

| Layer | Owns | Examples |
|---|---|---|
| 🧭 Pages | route composition and screen-level layout | `LibraryPage`, `SettingsPage`, `ResearchPage` |
| 🧩 Features | domain UI modules and interaction surfaces | `GoogleDriveSettings`, `ResearchHistoryPanel`, `KnowledgeMergeModal` |
| 🪝 Hooks | React state, async lifecycle, derived UI state | `useResearch`, `useLibrary`, `useDailyInspiration` |
| 🧠 Services | app workflows and backend operations | `libraryService`, `researchService`, `googleDriveService` |
| 🔌 Repositories/API client | HTTP, IndexedDB fallback, pagination helpers | `apiClient`, `apiLibraryRepository`, `libraryRepository` |

Hooks and feature components do not build backend URLs directly. HTTP requests are centralized in `src/repositories/apiClient.ts`, while services such as `researchService`, `inspirationService`, `libraryService`, and `googleDriveService` expose app-level operations to React code.

Request/response types, status behavior, pagination metadata, and supported values are treated as backend contracts. Contract changes must update the frontend repository/service adapter and both workspace READMEs in the same change.

## 🎨 Styling

- Tailwind CSS is configured through the Vite Tailwind plugin.
- `src/index.css` defines light/dark CSS variables, Tailwind theme tokens, base styles, and shared utility classes.
- UI primitives live in `src/components/ui`.
- Layout components live in `src/components/layout` and `src/components/common`.
- Icons are provided by `lucide-react`.
- Markdown content supports GitHub-flavored Markdown, math rendering with KaTeX, and Mermaid diagrams.

## 📡 API Integration

API access is centralized in `src/repositories/apiClient.ts`.

- Requests use `VITE_API_URL`, defaulting to `http://127.0.0.1:4000`.
- Requests include credentials for cookie-based auth.
- JSON, form, text, and streaming requests all flow through `apiClient`.
- AI defaults, model catalog, and user customization are loaded from `/api/v1/ai-customization`.
- Paginated API lists are collected with `getAllPages`.

Implemented API-backed repositories cover:

- Authentication and profile updates
- Sources and file previews
- Knowledge pages
- Notes and note promotion to source of truth
- Journal entries
- Research threads and chat
- AI customization
- Daily inspiration
- Google Drive connection status, Google folder picking, immediate sync, and disconnect

The Google Drive panel calls `googleDriveService`; it never receives provider tokens. Connect/Reconnect redirects through the authenticated backend OAuth start endpoint, where Google grants read-only Drive access. After connection, the panel opens a searchable hierarchical My Drive folder picker backed by the backend Drive folder list endpoint. The panel displays the connected Google email only for recognition, reports sync/error state, and offers Sync now, Choose another folder, and Disconnect. Folder polling imports only supported files directly inside that folder, not subfolders.

IndexedDB fallback stores are declared in `src/repositories/indexedDbClient.ts`:

- `knowledge`
- `sources`
- `notes`
- `journal`

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server on `127.0.0.1` |
| `npm run build` | Type-check with TypeScript and build with Vite |
| `npm run preview` | Preview the production build locally on `127.0.0.1` |
| `npm run lint` | Run ESLint |
