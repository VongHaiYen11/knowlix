# Frontend Agent Guidelines

These rules describe the current Knowlix frontend. Keep them aligned with the actual code before relying on them.

## Current Stack

- React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7.
- Markdown rendering uses `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex`, and `mermaid`.
- Icons come from `lucide-react`.
- API calls are centralized through `src/repositories/apiClient.ts`.

## App Shell and Navigation

- Route definitions live in `src/App.tsx`; route paths live in `src/constants/routes.ts`.
- Primary navigation is owned by `src/components/layout/AppShell.tsx`.
- Current nav order is `Home`, `Library`, `Research`, `Journal`, `Customization`, `Settings`.
- `AppShell` owns the sidebar, mobile drawer, collapse control, logout affordance, and global theme toggle.
- Do not move the theme toggle into page headers; the shell is the global-control surface.
- Use `PageShell` and `PageHeader` for routed pages unless a page has a deliberately different full-screen/editor layout.

## Design System

- Prefer existing UI components in `src/components/ui`: `Badge`, `Button`, `Card`, `ConfirmDialog`, `Dropdown`, `EmptyState`, `SearchInput`, `Skeleton`, `Tabs`, and `Toggle`.
- Use semantic Tailwind classes backed by project CSS variables: `background`, `foreground`, `card`, `border`, `primary`, `secondary`, `accent`, `muted`, and `destructive`.
- Avoid hardcoded hex colors, one-off shadows, arbitrary radii, or ad hoc spacing when an existing token/component works.
- Use `cn()` from `src/utils/cn.ts` for conditional class composition.
- Keep layouts responsive by default; sidebar/mobile behavior should be handled through shared shell patterns rather than page-specific nav hacks.

## Data and API Rules

- Keep API behavior in repositories/services, not inside presentational components.
- `src/repositories/apiClient.ts` defaults `VITE_API_URL` to `http://127.0.0.1:4000` and sends credentials for cookie auth.
- Library data goes through `libraryService` and the `LibraryRepository` interface.
- `apiLibraryRepository` is the real app path when API mode is enabled; `indexedDbLibraryRepository` is fallback/offline/dev behavior only.
- Merge, regenerate, upload ingest, and source promotion require API-backed behavior; do not make IndexedDB the canonical path for those workflows.
- Use `getAllPages()` for paginated API lists that need complete collections.

## Product Behavior

- Library has three tabs: Source of Truth, Knowledge, and Notes.
- Supported upload/display source types are PDF, DOCX, TXT, and Markdown; keep frontend unions, labels, icons, accept lists, and backend constraints aligned when this changes.
- Source and Knowledge viewer/editor parity is intentional: source/knowledge pages have viewer routes and edit routes.
- Research threads are DB-backed through `/api/v1/research/threads`; local client state is a working/fallback cache, not the source of truth.
- Research summaries are thread-scoped modal previews. Do not turn them into Knowledge, Notes, or Library artifacts.
- Hide Research summary actions until the thread is eligible; do not show unusable disabled controls for ineligible short chats.
- Customization contains model, reasoning, temperature, and prompt requirement controls. The cost/token estimator feature has been removed and should not be reintroduced without a full product decision.

## Editing Standards

- Keep visible copy concise and in English unless the task explicitly asks otherwise.
- Reuse feature components under `src/features/*` before adding new page-local components.
- Keep large pages readable by extracting repeated panels, rows, or modal content into feature components.
- When changing a shared component such as `AppShell`, `PageShell`, `PageHeader`, `Button`, or `Dropdown`, check the routes that already consume it.
- Run `npm run build` in `frontend/` after TypeScript or component changes.
