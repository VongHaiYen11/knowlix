<div align="center">

# 🧠 Knowlix Frontend

**A private knowledge workspace for sources, notes, research chat, and journal capture.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061a23)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38BDF8?logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-GFM_%2B_Math_%2B_Mermaid-2D2A26?logo=markdown&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-5E7D63)

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
- 🎛️ Customization tab for Knowledge ingestion prompts, research behavior, model choice, reasoning level, and temperature.
- ⚙️ Settings for account profile, password, and theme.
- 🌗 Light/dark theme support.
- 🇻🇳 Vietnam-time date helpers for user-facing daily behavior.

## 🛠 Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061a23)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38BDF8?logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Lucide](https://img.shields.io/badge/Icons-lucide--react-5E7D63)
![KaTeX](https://img.shields.io/badge/Math-KaTeX-2D2A26)
![Mermaid](https://img.shields.io/badge/Diagrams-Mermaid-ff3670)

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
Page -> Hook -> Service -> Repository -> API or IndexedDB
```

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
