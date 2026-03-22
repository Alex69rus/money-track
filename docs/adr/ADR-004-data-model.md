# ADR-004: Data Model Design

## Status
Accepted

## Context
We need a practical schema for transaction tracking with Telegram user isolation.

## Decision
Core tables:
- `transactions`: transaction facts from SMS and user edits
- `categories`: predefined shared categories

Key constraints:
- `user_id` stored as BIGINT (Telegram user ID)
- `tags` stored as PostgreSQL array (`text[]`)
- `category_id` optional FK
- Unique transaction identity constraint on `(user_id, message_id)` where applicable

MVP constraints:
- Single currency: AED
- User-specific data isolation
- Predefined global categories

## Rationale
- Keeps model expressive but simple.
- Preserves compatibility with n8n + API workflows.

## Consequences
- Straightforward CRUD/query behavior.
- Good extensibility for future reporting/filtering needs.

## Date
2026-03-20
