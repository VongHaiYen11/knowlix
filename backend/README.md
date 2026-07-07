# Knowlix Backend

Express + PostgreSQL API for the entities described in `frontend/be-description.md`.

## Setup

```bash
cd backend
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```

The API listens on `http://127.0.0.1:4000` by default.

All `/api/v1/*` endpoints require:

```http
Authorization: Bearer dev-token
```

## Frontend

Create `frontend/.env.local` to switch the app from IndexedDB to this API:

```bash
VITE_API_URL=http://127.0.0.1:4000
VITE_API_TOKEN=dev-token
```

If `VITE_API_URL` is omitted, the frontend keeps using IndexedDB.

## Scripts

- `npm run dev`: run the API with hot reload.
- `npm run build`: type-check and compile TypeScript.
- `npm run db:migrate`: apply the PostgreSQL schema.

## Implemented API

- `GET /api/v1/me`
- `GET /api/v1/knowledge`
- `GET /api/v1/knowledge/:slug`
- `POST /api/v1/knowledge`
- `PATCH /api/v1/knowledge/:slug`
- `DELETE /api/v1/knowledge/:slug`
- `GET /api/v1/sources`
- `GET /api/v1/sources/:id`
- `POST /api/v1/sources`
- `POST /api/v1/sources/upload`
- `PATCH /api/v1/sources/:id`
- `DELETE /api/v1/sources/:id`
- `GET /api/v1/notes`
- `GET /api/v1/notes/:id`
- `POST /api/v1/notes`
- `PATCH /api/v1/notes/:id`
- `DELETE /api/v1/notes/:id`
- `GET /api/v1/journal`
- `POST /api/v1/journal/:date/entries`
- `PATCH /api/v1/journal/:date`
- `GET /api/v1/graph`
- `POST /api/v1/research/messages`
