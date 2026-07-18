# ADR-001: Application Architecture

## Status

Accepted

## Context

Money Track is a Telegram-based personal money tracker. It needs one clear application boundary for Telegram updates, AI-assisted transaction processing, authenticated product APIs, and the Telegram Mini App.

## Decision

- Keep the product as an explicit monolith: FastAPI backend, React Telegram Mini App, and PostgreSQL database.
- Use Python FastAPI in `backend_new` with Piccolo ORM for Telegram ingestion, SMS parsing, category suggestion, and product APIs.
- Use OpenAI structured output in the backend for SMS transaction extraction and category suggestion.
- Use React, TypeScript, Vite, Tailwind, shadcn/ui, and the Telegram Web App SDK in `frontend_new` for the product interface.
- Treat PostgreSQL as the system of record. Core tables are `transactions` and `categories`.
- Store Telegram `user_id` values as BIGINT, tags as PostgreSQL `text[]`, and allow an optional `category_id`. Deduplicate Telegram-ingested transactions by `(user_id, message_id)` where applicable.
- Authenticate product API requests using Telegram Web App `initData`, validate its hash in the backend, and isolate data by `user_id`.
- Keep secrets and runtime settings in environment variables; do not embed credentials in application code.

## Rationale

- One backend owns the integration and business-logic boundary, avoiding duplicated orchestration and credentials.
- The selected frontend stack provides a small, typed interface suited to Telegram Web App constraints.
- PostgreSQL supports the transactional and analytical workload without extra infrastructure.
- Telegram-native authentication fits the product surface without introducing a separate login system.

## Consequences

- The backend owns Telegram, AI-assisted processing, and product API behavior; the frontend owns the user interface.
- The application remains intentionally coupled to Telegram identity and its Web App platform.
- Changes to transaction schema, authentication, or product-stack boundaries belong in this ADR.

## Date

2026-07-18
