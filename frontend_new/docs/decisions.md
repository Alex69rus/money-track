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

## Dec-004 (TWA-1 Native Telegram Navigation)

Date: 2026-07-11

- Telegram launch redirects to Transactions and keeps the four approved primary destinations—Transactions, Analytics, AI Chat, and Settings—in the persistent bottom navigation.
- In Telegram, do not render the persistent `Money Track` web header. Keep primary bottom navigation, but hide it when a nested full-page flow is active or while the keyboard is open.
- Treat transaction edit, category selection, tag selection, and analytics drilldown as nested full-page routes. `window.Telegram.WebApp.BackButton` returns from those pages; it stays hidden on primary destinations.
- Transaction edit, category selection, tag selection, and analytics category drilldown are full-page routes. Keep only destructive confirmations as dialogs.
- Editable fields scroll inside the correct page scroll container after focus and after Telegram viewport changes. Use stable/current viewport values to reserve keyboard scroll space.
- Apply the greater of Telegram's content-safe top inset and a 5rem fullscreen host-controls reserve, followed by the normal 1rem content gutter, to primary pages and every fixed full-page surface so host controls never overlap app content.
- On Bot API 7.7+, call `disableVerticalSwipes()`. On Bot API 8.0+, request fullscreen at startup and after a fullscreen exit. Both behaviors are version-gated requests: Telegram can still expose host controls or decline fullscreen.
