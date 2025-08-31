# ADR-005: Authentication and Security

## Status
Accepted

## Context
We need secure authentication for the Telegram Web App while keeping implementation simple and avoiding unnecessary complexity for MVP.

## Decision
Authentication approach:
- **Telegram Web App built-in authentication**: Use `window.Telegram.WebApp.initData`
- **Server-side validation**: Validate Telegram's initData hash in .NET API
- **API Security**: UI → .NET API via Telegram initData validation
- **No additional auth layers**: Rely on Telegram's security model

Security measures:
- Validate Telegram initData hash server-side
- User isolation at database level (user_id foreign keys)
- Environment variables for sensitive configuration
- HTTPS only in production

## Rationale
- **Telegram built-in auth**: Secure, well-tested, no additional complexity
- **Hash validation**: Ensures requests come from legitimate Telegram users
- **Simple implementation**: No JWT, sessions, or complex auth flows needed
- **Telegram security model**: Leverages platform's existing security

## Consequences
- Tight coupling to Telegram platform
- Simple implementation and maintenance
- Users can only access via Telegram Web App
- Secure user isolation without complex auth logic
- No separate user registration/login flow needed

## Date
2024-08-31