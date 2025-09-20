# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Track is a Telegram bot and web app for personal money tracking. The system processes bank SMS messages through n8n workflows and provides a React web interface for transaction management and analytics.

## Architecture Overview

**System Components:**
- **n8n workflows**: SMS parsing and AI chat (existing, external)
- **.NET Minimal API**: Single assembly backend for transaction CRUD
- **React + TypeScript**: Frontend with Material-UI components
- **PostgreSQL**: Shared database between n8n and .NET API
- **Telegram Web App**: Browser-based interface accessed via Telegram

**Key Architectural Decisions:**
- Monolithic .NET backend (single assembly, no microservices)
- No caching layer - direct database queries only
- No repository pattern - direct Entity Framework usage
- Environment variables for all configuration

## Development Process

**CRITICAL**: Follow the iterative development workflow defined in `docs/workflow.md`.

**Workflow Steps:**
1. **Plan → Approve → Implement → Test → Confirm → Commit → Next**
2. Always propose solution with code snippets before implementing
3. Update progress in `docs/tasklist.md` after each iteration
4. Wait for explicit approval before moving to next iteration

## Local Testing

**Frontend/Backend Testing:**
- **Development Mode**: Run backend with `ASPNETCORE_ENVIRONMENT=Development` to bypass Telegram authentication
- **Command**: `cd backend && ASPNETCORE_ENVIRONMENT=Development dotnet run --urls=http://localhost:5000`
- **Frontend**: `cd frontend && REACT_APP_API_URL=http://localhost:5000 npm start`
- **Access**: Open browser at `http://localhost:3000` - no Telegram context required
- **Database**: Uses real PostgreSQL data, full API functionality available for testing
- **Testing**: Use Playwright to test frontend/backend features end-to-end and verify network requests
- **Verification**: Check network requests to confirm correct front-end to back-end interaction. Always pay attention to network

## Code Conventions

Follow `conventions.md` strictly:

**.NET Backend:**
- Minimal API endpoints (no controllers)
- Entity Framework with `IEntityTypeConfiguration<T>`
- Async methods by default
- ILogger for Info/Error only
- Direct service injection (no abstractions)

**React Frontend:**
- TypeScript required
- Material-UI standard components
- Function components only
- Direct fetch calls (no axios)
- Simple state management (useState/useEffect only)

**Database:**
- EF Core migrations from .NET backend
- PostgreSQL arrays for tags field
- Standard FK relationships in entity configurations

## Key Files Structure

```
backend/                    # Single .NET Minimal API
├── Models/                # Entities and DTOs
├── Services/              # Business logic
├── Data/                  # EF context and configurations
└── Program.cs            # Entry point

frontend/src/
├── components/           # Reusable UI components
├── pages/               # Main screens
├── services/            # API calls
└── types/              # TypeScript definitions
```

## Data Model

Core entities:
- **Transactions**: Parsed SMS data with tags array, category FK, UserId as BIGINT (Telegram user ID)
- **Categories**: Predefined global categories

Currency: AED only
Authentication: Telegram Web App initData validation
Note: No separate Users table - UserId field stores Telegram user ID directly

## Never Do
- Add microservices or complex architecture
- Create repository patterns or excess abstractions
- Use complex state management (Redux, Context API)
- Add integration tests for MVP
- Implement caching solutions

## Always Do
- Reference `vision.md` for feature scope
- Update `docs/tasklist.md` progress table
- Use async/await for API operations
- Implement basic error handling and logging
- Wait for approval before each implementation phase