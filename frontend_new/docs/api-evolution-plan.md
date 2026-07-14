# Frontend API Contract

`frontend_new` isolates HTTP access under `src/services/api/`. Components call hooks or typed service adapters rather than `fetch` directly.

## Current endpoints

- `GET /health`
- `GET /api/categories`
- `GET`, `POST`, `PUT`, and `DELETE /api/transactions`
- `GET /api/tags`
- `POST /api/chat`

## Required client behavior

- Read `VITE_API_BASE_URL` in the shared client and attach `X-Telegram-Init-Data` to API requests.
- Use typed DTO mappings and `AbortController` cancellation.
- Surface typed failures to UI recovery paths.
- Allow labelled fallback data only for development/test read paths; never silently fall back for writes or chat posts.
- Reuse backend tag options in filter and transaction-edit selector flows.

## Deferred, separately approved work

- Define a stable response schema for `/api/chat`.
- Move list-based client analytics aggregation to a dedicated backend endpoint if scale requires it.

Neither item is part of frontend redesign completion.
