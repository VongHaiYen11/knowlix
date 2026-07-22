# Knowlix Agent Guidelines

These rules apply to the entire repository. More specific rules in `backend/AGENTS.md` and `frontend/AGENTS.md` also apply inside those folders.

## Architecture Source of Truth

- Read `docs/architecture_design_pattern.md` before introducing a new layer, dependency direction, persistence path, mapper, use case, or external-service wrapper.
- Preserve the dependency direction: route -> controller -> service/use case -> repository or infrastructure port.
- Prefer the existing module and feature patterns over creating parallel abstractions.
- Keep frontend and backend request/response types, supported values, pagination behavior, and error behavior aligned.
- A refactor is not behavior-preserving if it changes an HTTP shape, status code, redirect, persistence semantics, background-job behavior, model choice, storage ownership, or user-visible workflow.
- Model account integrations as resources owned by the authenticated Knowlix `user_id`. Never infer Knowlix identity, create users, or merge users from an external provider email.
- External sync workers must reuse domain inputs/use cases instead of constructing framework-specific upload objects. Keep provider adapters, durable tracking, leases, retries, and disconnect semantics explicit.

## Documentation Is Part of the Change

Before finishing any code change, explicitly assess documentation impact and update every affected README in the same change:

- Update `backend/README.md` for backend routes, schemas, status/error behavior, database/storage contracts, migrations, environment variables, scripts, architecture, ingestion/research flows, or internal module names documented there.
- Update `frontend/README.md` for routes, navigation, user-visible behavior, rendering rules, frontend architecture, API integration, environment variables, or scripts.
- Update the root `README.md` for cross-stack contracts, supported product capabilities, setup, stack, top-level workflow, or project structure.
- Update `docs/architecture_design_pattern.md` when a design pattern, layer boundary, dependency rule, or architecture guard changes.
- Update the scoped `AGENTS.md` files when a new durable coding rule or convention is introduced.
- If no README edit is required, verify that the existing descriptions remain accurate; do not assume an internal refactor has no documentation impact when README files name internal modules or flows.

## Verification

- Run the checks required by each changed workspace.
- For a cross-stack contract change, build both `backend/` and `frontend/` after updating both sides.
- Do not finish with stale file names, removed controls, deprecated models, or obsolete commands in documentation.
