# 📐 Architecture & Design Patterns

> A concise catalog of the recognized software architectures and design patterns used by **Knowlix**.

This document describes the patterns that are visible in the current codebase. Product-specific choices are kept in [Architectural Decisions](#architectural-decisions) so they are not presented as general design patterns.

## 🧭 Architecture at a Glance

### Backend

```text
HTTP Request
    │
    ▼
Route ──► Controller ──► Service / Use Case ──► Repository ──► PostgreSQL
                                   │
                                   └──────────► Adapter ─────► External Provider
```

### Frontend

```text
Page / Feature ──► Hook or Service ──► Repository / API Client ──► Backend API
```

These are dependency boundaries, not a requirement that every operation pass through every possible layer. A simple page may call a service directly, while a stateful workflow may use a hook first.

## 1. 🧱 Layered Architecture

| | |
| --- | --- |
| **Category** | Architectural pattern |
| **Backend locations** | `backend/src/modules/**/{*.routes,*.controller,*.service,*.repository}.ts`, `backend/src/modules/*/use-cases/` |
| **Frontend locations** | `frontend/src/pages/`, `frontend/src/features/`, `frontend/src/hooks/`, `frontend/src/services/`, `frontend/src/repositories/` |

### Intent

The application is divided into layers with distinct responsibilities:

- **Routes** define endpoints, authentication, middleware, and request validation.
- **Controllers** translate HTTP input and output.
- **Services and use cases** coordinate application and business workflows.
- **Repositories** own persistence access.
- **Adapters** isolate external providers and SDKs.
- **Frontend pages and features** compose the user experience, while hooks, services, and repositories own stateful workflows and data access.

Dependencies move toward the persistence or provider boundary through the layer immediately responsible for that concern. HTTP details do not belong in backend business workflows, and browser request details do not belong in visual components.

### Benefits

- Clear separation of concerns
- Lower coupling between delivery, business, and infrastructure code
- Smaller units for testing and maintenance
- Easier replacement of persistence and provider implementations

## 2. 🎯 Clean Architecture: Use Case Layer

| | |
| --- | --- |
| **Category** | Architectural style applied to complex workflows |
| **Locations** | `backend/src/modules/sources/use-cases/`, `backend/src/modules/google-drive/use-cases/` |

### Intent

Multi-step business workflows are represented by focused use case classes instead of being embedded in controllers. Their dependencies are constructor-injected through narrow TypeScript ports, commonly expressed with `Pick<...>` structural types.

Current examples include:

- `IngestSourceFileUseCase`
- `GenerateSourceSummaryUseCase`
- `DeleteSourceUseCase`
- `ScanGoogleDriveUseCase`
- `ProcessGoogleDriveFileUseCase`

The default composition uses production repositories, storage services, and provider adapters. Tests can replace those dependencies with small in-memory fakes.

### Benefits

- Business workflows remain independent of Express request objects
- Complex orchestration is explicit and individually testable
- Manual uploads and provider sync can reuse the same ingestion behavior
- Infrastructure dependencies can be substituted in tests

> Knowlix applies the use case and dependency-injection ideas of Clean Architecture. It does not claim that every module follows a complete concentric Clean Architecture implementation.

## 3. 🗄️ Repository Pattern

| | |
| --- | --- |
| **Category** | Data access pattern |
| **Locations** | `backend/src/modules/**/*.repository.ts`, `backend/src/lib/storage.repository.ts` |
| **Examples** | `sources.repository.ts`, `knowledge.repository.ts`, `google-drive.repository.ts` |

### Intent

Repositories encapsulate PostgreSQL operations, transactions, row locking, query construction, and persistence semantics. Services and use cases interact with repository methods instead of issuing SQL directly.

Frontend library access follows the same principle through `LibraryRepository`, with the production implementation backed by the backend API.

### Benefits

- Centralized persistence logic
- Business code that is easier to read and test
- Consistent ownership and query behavior
- Frontend data access stays aligned with backend-owned persistence

## 4. 🔄 Data Mapper Pattern

| | |
| --- | --- |
| **Category** | Data transformation pattern |
| **Locations** | `backend/src/modules/**/*.mapper.ts` |
| **Examples** | `sources.mapper.ts`, `knowledge.mapper.ts`, `google-drive.mapper.ts` |

### Intent

Mapper functions translate persistence rows into domain or API-facing objects. They convert PostgreSQL `snake_case` fields to frontend-friendly `camelCase`, remove persistence-only details, and keep response shaping out of controllers.

### Benefits

- Database rows do not leak directly into API contracts
- Mapping rules have one recognizable home
- Persistence and response models can evolve independently
- Sensitive or internal fields can be omitted consistently

## 5. 🔌 Adapter Pattern

| | |
| --- | --- |
| **Category** | Structural design pattern |
| **Locations** | `backend/src/modules/google-drive/google-drive.adapter.ts`, `backend/src/lib/storage.ts`, `backend/src/config/gemini.ts` |
| **Providers** | Google Drive, Supabase Storage, Gemini |

### Intent

Provider SDKs are contained behind application-facing methods. Google Drive metadata and downloads are normalized by `googleDriveAdapter`; Supabase object operations are exposed by `storageService`; Gemini client creation and cross-cutting behavior are centralized in `getGeminiClient()`.

### Benefits

- Provider-specific objects stay out of controllers and API responses
- External calls are easier to mock
- Authentication, normalization, and error handling remain centralized
- Provider changes have a smaller impact on business workflows

## 6. 🛡️ Proxy Pattern

| | |
| --- | --- |
| **Category** | Structural design pattern |
| **Location** | `backend/src/config/gemini.ts` |

### Intent

JavaScript `Proxy` objects wrap the Gemini client and its `models` interface. Calls to `generateContent`, `generateContentStream`, and `embedContent` are intercepted transparently to add:

- Retry behavior
- Backoff between attempts
- Structured call logging
- Execution timing

Other SDK properties and methods are forwarded to the original client without modifying the SDK instance.

### Benefits

- Cross-cutting behavior is implemented once
- Calling modules use the normal Gemini SDK interface
- Retry and observability behavior remain consistent
- The provider SDK is not monkey-patched
