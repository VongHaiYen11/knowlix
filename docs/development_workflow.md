# Development Workflow

This guide summarizes the checks and documentation expectations for Knowlix changes.

## Local Setup

Install dependencies in both workspaces:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Start PostgreSQL and run migrations:

```bash
cd backend
docker-compose up -d
npm run db:migrate
```

Run development servers:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

## Verification Commands

Backend:

```bash
cd backend
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

For cross-stack API contract changes, run both backend and frontend builds after updating both sides.

## Architecture Review

Before finishing a code change, check:

- backend routes call controllers, controllers call services/use cases, and services/use cases call repositories or adapters
- SQL and transactions remain in repositories
- provider SDKs remain in adapters or infrastructure config
- frontend hooks and components call services instead of building API URLs
- browser requests are centralized in `frontend/src/repositories/apiClient.ts`
- request/response types match across backend and frontend

## Documentation Review

Update documentation in the same change when behavior changes:

- `README.md` for cross-stack product capabilities, setup, top-level workflow, and project structure
- `backend/README.md` for backend routes, schemas, storage, database, migrations, env vars, ingest, research, and integration behavior
- `frontend/README.md` for routes, navigation, UI behavior, API integration, env vars, and rendering rules
- `docs/architecture_design_pattern.md` for architecture boundaries or durable patterns
- feature docs under `docs/` when a workflow needs standalone explanation

If no README edit is needed, explicitly verify that existing descriptions are still accurate.
