# ADR-008: Configuration Management

## Status
Accepted

## Context
We need simple and explicit configuration for containerized runtime.

## Decision
- Environment variables are the primary configuration mechanism.
- Backend configuration is centralized in `backend_new/app/core/config.py`.
- React uses build-time environment variables.
- Docker Compose `.env` / `.env.prod` drives deployment variables.

Configuration domains:
- Database URL and credentials
- Telegram bot token / auth settings
- API host/port/environment
- n8n webhook URLs
- frontend public API URLs

## Rationale
- Environment-variable-driven config fits Docker deployment patterns.
- Single backend settings module reduces drift and hidden defaults.

## Consequences
- Low complexity config management.
- Requires disciplined secret handling in deployment environments.

## Date
2026-03-20
