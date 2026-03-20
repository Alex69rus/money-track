# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

Money Track is a Telegram bot and web app for personal money tracking. The system processes bank SMS messages through n8n workflows and provides a React web interface for transaction management and analytics.

## Architecture Overview

**System Components:**
- **n8n workflows**: SMS parsing and AI chat (existing, external)
- **Python FastAPI backend**: Transaction CRUD and read APIs in `backend_new`
- **React + TypeScript**: Frontend with Material-UI components
- **PostgreSQL**: Shared database between n8n and backend API
- **Telegram Web App**: Browser-based interface accessed via Telegram

**Key Architectural Decisions:**
- Monolithic Python backend (`backend_new`)
- No caching layer - direct database queries only
- Keep abstractions minimal and explicit
- Environment variables for all configuration

## Development Process

**Workflow Steps:**
1. **Plan -> Approve -> Implement -> Test -> Confirm -> Commit -> Next**
2. Always propose solution with code snippets before implementing
3. Update progress in `docs/tasklist.md` after each iteration
4. Wait for explicit approval before moving to next iteration

## Local Testing

**Frontend/Backend Testing:**
- **Development Mode**: Run backend with `ENVIRONMENT=Development` to bypass Telegram authentication
- **Backend Command**: `cd backend_new && ENVIRONMENT=Development DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`
- **Frontend Command**: `cd frontend && REACT_APP_API_URL=http://localhost:8000 npm start`
- **Access**: Open browser at `http://localhost:3000` - no Telegram context required
- **Database**: Uses real PostgreSQL data, full API functionality available for testing
- **Testing**: Use chrome-devtools MCP to test frontend/backend features end-to-end and verify network requests
- **Verification**: Check network requests to confirm correct front-end to back-end interaction

## Code Conventions

Follow `conventions.md` strictly.

**Python Backend:**
- FastAPI routes grouped by domain (`transactions`, `categories`, `tags`, `health`)
- Piccolo ORM for runtime DB access
- Async methods by default
- Logging at info/error level only
- Strong typing in schemas and query/service boundaries

**React Frontend:**
- TypeScript required (strict mode, no `any`)
- Material-UI standard components
- Function components only
- Direct fetch calls (no axios)
- Simple state management (`useState` / `useEffect` only)
- Custom hooks for business logic (extract API calls)
- Max 150 lines per component
- AbortController for request cancellation
- Loading and error states always
- Accessibility with ARIA labels

**Database:**
- Piccolo migrations from `backend_new`
- PostgreSQL arrays for tags field
- Standard FK relationships

## Key Files Structure

```text
backend_new/
├── app/
│   ├── api/routes/
│   ├── services/
│   ├── schemas/
│   ├── db/
│   └── main.py
├── tests/
└── piccolo_migrations/

frontend/src/
├── components/
├── pages/
├── services/
└── types/
```

## Data Model

Core entities:
- **Transactions**: Parsed SMS data with tags array, category FK, `user_id` as BIGINT (Telegram user ID)
- **Categories**: Predefined global categories

Currency: AED only  
Authentication: Telegram Web App initData validation  
Note: No separate Users table - `user_id` stores Telegram user ID directly.

## React Frontend Development

When working on React code, delegate implementation to the `react-expert-advisor` agent.

**When to delegate to react-expert-advisor:**
- Creating new React components
- Refactoring existing React components
- Implementing React features (state management, custom hooks, etc.)
- Reviewing React code for best practices
- Fixing React-specific bugs or issues
- Optimizing React component performance

**Quick Reference:**
- Max 150 lines per component - split if longer
- Extract API calls to custom hooks with AbortController cleanup
- Always show loading/error states (prefer Skeleton components)
- No `any` types
- Use theme tokens for all styling
- Mobile-first responsive design (test at 375px and 1920px)
- ARIA labels on all interactive elements

## Never Do

**Backend:**
- Add microservices or complex architecture
- Add unnecessary abstractions or repository patterns
- Implement caching solutions without a proven need
- Use `/tmp` for temporary files; use files under the current working directory

**Frontend:**
- Use `any` type in TypeScript
- Create components >150 lines
- Mix business logic with UI rendering
- Pass setState functions as props
- Hardcode colors or spacing values
- Skip loading/error states
- Forget `useEffect` cleanup for async operations
- Use Context API or Redux
- Premature optimization without profiling

## Always Do

**General:**
- Reference `vision.md` for feature scope
- Update `docs/tasklist.md` progress table
- Wait for approval before each implementation phase

**Frontend:**
- Extract custom hooks for API calls
- Implement AbortController cleanup in `useEffect`
- Show loading states (Skeleton preferred)
- Show user-friendly error messages with retry
- Use theme tokens for all styling
- Delegate React implementation to `react-expert-advisor`
- After implementation, use `qa-expert` agent for comprehensive testing
- Add ARIA labels for interactive elements
- Follow TypeScript strict mode

**Backend:**
- Use async/await for API operations
- Implement basic error handling and logging
- Keep DB access on Piccolo ORM in runtime code
