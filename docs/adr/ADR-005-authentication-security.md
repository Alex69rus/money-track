# ADR-005: Authentication and Security

## Status
Accepted

## Context
The app runs inside Telegram Web App and needs simple, reliable auth with backend-side verification.

## Decision
Authentication approach:
- Use Telegram Web App `initData` as authentication input.
- Validate Telegram hash server-side in FastAPI.
- In local development mode (`ENVIRONMENT=Development`), allow configured auth bypass for productive testing.

Security measures:
- Backend-side `initData` validation in production mode
- User isolation at DB level by `user_id`
- Environment variables for secrets
- HTTPS in production

## Rationale
- Leverages Telegram-native auth flow.
- Avoids unnecessary auth layers for current product scope.

## Consequences
- Tight Telegram platform coupling (expected).
- No separate app-specific login system.

## Date
2026-03-20
