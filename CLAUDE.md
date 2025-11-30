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
- **Testing**: Use chrome-devtools MCP to test frontend/backend features end-to-end and verify network requests
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
- TypeScript required (strict mode, no 'any')
- Material-UI standard components
- Function components only
- Direct fetch calls (no axios)
- Simple state management (useState/useEffect only)
- Custom hooks for business logic (MUST extract API calls)
- Max 150 lines per component
- AbortController for request cancellation
- Loading and error states ALWAYS
- Accessibility with ARIA labels

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

## React Frontend Development

**IMPORTANT**: When working on React code, **delegate implementation to the react-expert-advisor agent** using the Task tool.

**When to delegate to react-expert-advisor:**
- Creating new React components
- Refactoring existing React components
- Implementing React features (state management, custom hooks, etc.)
- Reviewing React code for best practices
- Fixing React-specific bugs or issues
- Optimizing React component performance

**The agent will:**
- Write/edit React code following project standards
- Apply modern React 18+ patterns and best practices
- Ensure TypeScript strict mode compliance
- Implement proper error handling and loading states
- Use Material-UI theming and responsive design
- Add accessibility (ARIA labels) by default
- Extract custom hooks for API calls with AbortController

**Quick Reference (for simple tasks you handle directly):**
- Max 150 lines per component - split if longer
- Extract API calls to custom hooks with AbortController cleanup
- Always show loading/error states (prefer Skeleton components)
- No 'any' types - use TypeScript strict mode
- Use theme tokens for all styling (no hardcoded values)
- Mobile-first responsive design (test at 375px and 1920px)
- ARIA labels on all interactive elements

**Example delegation:**
```
User: "Add a date range filter to the transactions page"
You: Use Task tool with react-expert-advisor to implement the feature
Agent: Implements DateRangeFilter component with proper hooks, types, and MUI components
```

## Never Do

**Backend:**
- Add microservices or complex architecture
- Create repository patterns or excess abstractions
- Add integration tests for MVP
- Implement caching solutions

**Frontend:**
- Use 'any' type in TypeScript
- Create components >150 lines
- Mix business logic with UI rendering
- Pass setState functions as props
- Hardcode colors or spacing values
- Skip loading/error states
- Forget useEffect cleanup for async operations
- Use Context API or Redux
- Premature optimization (memoization without profiling)

## Always Do

**General:**
- Reference `vision.md` for feature scope
- Follow workflow described in [docs/workflow.md](docs/workflow.md) file
- Update `docs/tasklist.md` progress table
- Wait for approval before each implementation phase

**Frontend:**
- Extract custom hooks for API calls
- Implement AbortController cleanup in useEffect
- Show loading states (Skeleton preferred)
- Show user-friendly error messages with retry
- Use theme tokens for all styling
- For React implementations: delegate to react-expert-advisor agent
- After implementation: use qa-expert agent for comprehensive testing
- qa-expert will: test with Chrome DevTools MCP, check network tab for real API calls, validate responsive layouts
- Add ARIA labels for interactive elements
- Follow TypeScript strict mode (no 'any')

**Backend:**
- Use async/await for API operations
- Implement basic error handling and logging