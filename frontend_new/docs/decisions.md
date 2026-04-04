# Redesign Decisions

Locked product decisions for the `frontend_new` redesign kickoff.

Date: 2026-04-04

## Dec-001 (FR-038)

Category filtering in transactions redesign uses single category selection.

- UI should present single category selection behavior.
- Do not expose multi-category UI selection in this redesign scope.

## Dec-002 (FR-039)

Keep multi-currency support in transaction edit flow.

- Edit surface must continue supporting multiple currencies.
- API payloads and validation must preserve multi-currency semantics.

## Dec-003 (AI Chat Scope)

AI Chat is a backend-linked stub for now.

- FE uses API base URL only (`VITE_API_BASE_URL`), with chat path under backend namespace (`/api/chat`).
- Do not introduce dedicated chat webhook env in `frontend_new`.
- Full FE/BE chat implementation is deferred to a later slice.

