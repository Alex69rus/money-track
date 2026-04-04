# API Evolution Plan (FE-First)

Backend API is a starting point for redesign, not a strict boundary.

This document tracks how `frontend_new` integrates today and how FE-driven API changes should be staged.

## Current Starting Endpoints

From legacy frontend behavior:

- `GET /health`
- `GET /api/categories`
- `GET /api/transactions`
  - params currently include `skip`, `take`, `fromDate`, `toDate`, `categoryId`, `minAmount`, `maxAmount`, `tags`, `text`
- `GET /api/transactions/{id}`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET /api/tags`
- `POST /api/chat` (stub target in redesign scaffold; full contract deferred)

## Adapter-First FE Structure

Keep backend volatility away from UI components:

```text
src/services/api/
  client.ts           # base fetch client, headers, retries, abort support
  telegram-auth.ts    # initData header wiring
  dto.ts              # raw API types
  mappers.ts          # dto <-> ui model normalization
  transactions.ts
  categories.ts
  tags.ts
  analytics.ts        # optional FE or BE analytics adapter
  chat.ts
```

## Required Request Contract

- Include `X-Telegram-Init-Data` on authenticated requests.
- Use `VITE_API_BASE_URL` for backend base URL.
- Keep request cancellation via `AbortController`.
- Expose clear typed errors to UI for recovery actions.

## Locked Decisions

- FR-038 is resolved for redesign scope: single category selection.
- FR-039 is resolved for redesign scope: keep multi-currency edit support.
- AI Chat uses backend namespace through `VITE_API_BASE_URL` and `/api/chat` path in current stub phase.

## Known Contract Tensions to Resolve

- Analytics currently client-side aggregation; backend endpoint may be introduced later.

## Change Workflow for BE Extensions

1. Implement FE adapter interface first (target behavior).
2. Mark temporary fallback mapping in adapter if backend is behind.
3. Document delta in this file:
   - endpoint change needed,
   - payload/response shape,
   - backward compatibility note.
4. Align backend implementation in a later dedicated step.

## Suggested Near-Term API Enhancements

- Dedicated analytics endpoint to reduce large list fetches.
- Unified chat endpoint with auth context and stable response schema.
- Explicit chat request/response schema for `/api/chat`.

## Fallback Policy

- In development, backend outages must not crash app (FR-031).
- Fallback data is allowed for non-critical workflows when explicitly labeled.
- Avoid hidden mock behavior in production builds.
