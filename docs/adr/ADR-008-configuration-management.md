# ADR-008: Configuration Management

## Status
Accepted

## Context
We need a simple configuration approach that supports containerized deployment while keeping complexity minimal for a single production environment.

## Decision
Configuration approach:
- **Single environment (Production)**: No dev/staging complexity
- **Environment variables only**: All configuration via env vars
- **No complex configuration management**: Keep it simple

Configuration sources:
- Database connection string (env var)
- Telegram bot settings (env var)
- n8n webhook URLs (env var)
- API keys/secrets (env var)

Files:
- `appsettings.json` for .NET API defaults
- `.env` file for Docker Compose
- React build-time environment variables

## Rationale
- **Single environment**: Reduces complexity for MVP
- **Environment variables**: Standard approach for containers
- **No secrets management**: Environment variables sufficient for MVP
- **Default values**: Reduce required configuration

## Consequences
- Simple configuration management
- All secrets in environment variables
- Easy Docker container configuration
- May need more sophisticated approach as project grows
- Single production environment reduces testing scenarios

## Date
2024-08-31