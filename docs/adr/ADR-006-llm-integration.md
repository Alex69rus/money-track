# ADR-006: LLM Integration Strategy

## Status
Accepted

## Context
We need AI chat capabilities without duplicating orchestration logic across services.

## Decision
- Keep AI logic in existing n8n workflows.
- Frontend talks to n8n webhook endpoints directly for chat interactions.
- Backend API remains focused on transactional CRUD/read concerns.

## Rationale
- Reuses working n8n automation.
- Keeps backend scope clean and maintainable.

## Consequences
- AI chat availability depends on n8n uptime.
- Faster product iteration on AI behavior via n8n workflow updates.

## Date
2026-03-20
