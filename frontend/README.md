# Knowlix Frontend

React + Tailwind CSS rebuild of the Knowlix knowledge app. Client-side routing uses React Router v7. This project intentionally does not include backend, server, API, or database code. Runtime data is stored in IndexedDB behind repository and service abstractions.

## Run

```bash
npm install
npm run dev
npm run build
```

## Structure

```text
src/
  components/
    ui/          reusable primitives such as Button, Card, Badge, Tabs, Dropdown
    common/      router, page header, section heading
    layout/      app shell and theme controls
  features/      page-specific sections split by domain
  hooks/         async state, theme, library, research, editor hooks
  pages/         route-level components only
  repositories/  IndexedDB implementation
  services/      business logic and future API boundary
  types/         shared TypeScript interfaces
  constants/     routes, app constants, seed data
  theme/         colors, typography, spacing, radius, shadows, breakpoints
  utils/         small framework-agnostic helpers
```

## Adding Pages

Add a route component in `src/pages`, split large sections into `src/features/<domain>`, then register the URL in the React Router route table in `src/App.tsx` and `src/constants/routes.ts`. Dynamic route params should be read with typed `useParams`, as shown by the knowledge `:slug` and note `:id` routes.

## Adding Components

Reusable UI patterns belong in `src/components/ui`. Shared layout or app-level pieces belong in `src/components/common` or `src/components/layout`. Feature-specific components stay under `src/features/<domain>`.

## Theme Changes

Edit the token modules in `src/theme`. Runtime CSS variables are declared in `src/index.css` so Tailwind utility classes resolve through centralized values.

## IndexedDB Organization

The data path is:

```text
UI -> hook -> service -> repository -> IndexedDB
```

Stores are declared in `src/repositories/indexedDbClient.ts`:

- `knowledge`
- `sources`
- `notes`
- `journal`
- `graphNodes`
- `graphLinks`

The first app load seeds IndexedDB from `src/constants/sampleData.ts`.

## Replacing IndexedDB With Backend APIs

Keep UI and hooks unchanged. Implement a new repository with the same `LibraryRepository` interface in `src/repositories/libraryRepository.ts`, then inject it into `LibraryService`.

Recommended migration path:

1. Create `apiLibraryRepository`.
2. Keep method return types identical.
3. Move request/response mapping into the repository.
4. Keep filtering/search behavior in the backend when real endpoints exist.
5. Leave pages and feature components untouched.
