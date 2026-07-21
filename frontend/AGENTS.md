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
- Reuse existing components whenever possible. If a UI pattern appears more than once, or two components are only slightly different, extract a shared component instead of copying the same structure again.
- Use semantic Tailwind classes backed by project CSS variables: `background`, `foreground`, `card`, `border`, `primary`, `secondary`, `accent`, `muted`, and `destructive`.
- Avoid hardcoded hex colors, one-off shadows, arbitrary radii, or ad hoc spacing when an existing token/component works.
- Use `cn()` from `src/utils/cn.ts` for conditional class composition.
- Keep layouts responsive by default; sidebar/mobile behavior should be handled through shared shell patterns rather than page-specific nav hacks.

## Component Placement

- Put only generic, app-wide primitives in `src/components/ui`. A component belongs there only when it has no product-specific language, route knowledge, data fetching, or Knowlix domain assumptions.
- Put shared page framing and global layout in `src/components/common` or `src/components/layout`, following the current `PageHeader`, `PageShell`, `SectionHeading`, `AppShell`, and `ThemeToggle` split.
- Put reusable domain UI in `src/features/<feature>/`. Examples: Library cards/lists belong under `features/library`, Research panels under `features/research`, editor controls under `features/editor`.
- Keep page files focused on route composition, state wiring, and high-level flow. Pages should not become home for reusable cards, drawers, modals, or table rows.
- If two feature components become genuinely generic, promote the shared primitive downward into `components/ui` only after removing feature-specific copy and assumptions.
- Do not create a second version of an existing primitive with a slightly different name. Extend the existing component API conservatively.

## Data and API Rules

- Keep API behavior in repositories/services, not inside presentational components.
- `src/repositories/apiClient.ts` defaults `VITE_API_URL` to `http://127.0.0.1:4000` and sends credentials for cookie auth.
- Library data goes through `libraryService` and the `LibraryRepository` interface.
- `apiLibraryRepository` is the real app path when API mode is enabled; `indexedDbLibraryRepository` is fallback/offline/dev behavior only.
- Merge, regenerate, upload ingest, and source promotion require API-backed behavior; do not make IndexedDB the canonical path for those workflows.
- Use `getAllPages()` for paginated API lists that need complete collections.
- Do not call `fetch` directly from pages or visual components. Add API behavior to a repository/service layer first.
- Keep request/response TypeScript interfaces next to the service that owns the API call unless the type is shared across multiple domains.
- Treat route strings as constants from `src/constants/routes.ts`; avoid hardcoded internal route strings inside components.
- Treat backend request/response shapes, status codes, pagination metadata, supported enum values, and redirects as contracts. Update frontend types and repository adapters in the same change when those contracts move.

## Product Behavior

- Library has three tabs: Source of Truth, Knowledge, and Notes.
- Supported upload/display source types are PDF, DOCX, TXT, and Markdown; keep frontend unions, labels, icons, accept lists, and backend constraints aligned when this changes.
- Source and Knowledge viewer/editor parity is intentional: source/knowledge pages have viewer routes and edit routes.
- Research threads are DB-backed through `/api/v1/research/threads`; local client state is a working/fallback cache, not the source of truth.
- Research summaries are thread-scoped modal previews. Do not turn them into Knowledge, Notes, or Library artifacts.
- Hide Research summary actions until the thread is eligible; do not show unusable disabled controls for ineligible short chats.
- Customization visibly exposes model, temperature, and prompt requirement controls. Reasoning-budget controls and the cost/token estimator are not part of the current UI and should not be reintroduced without an explicit product decision.

## Editing Standards

- Keep visible copy concise and in English unless the task explicitly asks otherwise.
- Reuse feature components under `src/features/*` before adding new page-local components.
- Do not let one file grow into a catch-all page. If a file becomes hard to scan or keeps accumulating unrelated sections, split repeated rows, panels, modals, cards, or hooks into focused feature components.
- Keep large pages readable by extracting repeated panels, rows, or modal content into feature components.
- When changing a shared component such as `AppShell`, `PageShell`, `PageHeader`, `Button`, or `Dropdown`, check the routes that already consume it.
- Keep modals, panels, and repeated form rows controlled by props when they are reusable. Do not hide important side effects inside presentational components.
- Avoid duplicating loading, empty, and error states. Reuse `Skeleton`, `EmptyState`, and existing feature-level patterns.
- Prefer lucide icons already used in the app. Do not add custom SVG icons unless no suitable icon exists.
- Treat documentation updates as part of implementation. Update `frontend/README.md` whenever routes, navigation, user-visible behavior, rendering rules, frontend architecture, API integration, environment variables, or scripts change.
- Update `backend/README.md` when a frontend change requires a backend contract change, and update the root `README.md` when capabilities, setup, or cross-stack workflow changes.
- Update `../docs/architecture_design_pattern.md` and the relevant `AGENTS.md` whenever a durable boundary or coding convention changes.
- Before finishing, search README/AGENTS files for stale controls, routes, model names, contract fields, and commands related to the change.
- Run `npm run build` in `frontend/` after TypeScript or component changes.
- For full-stack contract changes, run the backend tests/build after updating the backend side as well.
