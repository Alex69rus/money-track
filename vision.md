# Money Track - Technical Vision

## Technologies

- **SMS Processing & AI Chat**: Existing n8n workflows
- **Backend API**: .NET Web API (for UI requests and transaction CRUD)
- **Frontend**: Create React App + MUI + Telegram Web App SDK
- **Database**: PostgreSQL (shared between n8n workflows and .NET API)
- **Authentication**: Telegram Web App built-in auth (validate initData hash)
- **API Security**: UI -> .NET API via Telegram initData validation
- **Containerization**: Docker Compose for local development
- **Deployment**: Single VPS with Docker

Clean separation:
- n8n workflows work independently (SMS parsing, AI chat)
- .NET Web API serves the React UI
- Both systems share the same PostgreSQL database

## Development Principles

**Core Principles:**
- **KISS (Keep It Simple, Stupid)** - Simplest solution that works
- **YAGNI (You Aren't Gonna Need It)** - Don't build features until needed
- **MVP First** - Build minimal viable features, iterate based on feedback
- **No Premature Optimization** - Optimize only when needed
- **Convention over Configuration** - Use framework defaults where possible
- **Fail Fast** - Quick feedback loops, early error detection

**Development Practices:**
- **Git Flow**: Simple main branch + feature branches
- **Testing**: Unit tests only for critical business logic
- **Code Style**: Follow framework conventions (.NET conventions, Prettier for React)
- **Documentation**: Inline comments for complex logic only, README for setup

## Project Structure

```
money-track/
├── backend/                    # Single .NET Minimal API project
│   ├── Models/                # Data models & DTOs
│   ├── Services/              # Business logic
│   ├── Data/                  # Database context
│   └── Program.cs             # Main entry point
├── frontend/                   # React app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Main app screens
│   │   ├── services/         # API calls
│   │   └── types/           # TypeScript types
├── database/
│   └── migrations/           # SQL migration scripts
└── docker-compose.yml        # Local development setup
```

## Project Architecture

**System Components:**
- **Telegram Bot (n8n)** → **PostgreSQL** ← **Minimal API** ← **React Web App**

**Data Flow:**
1. User forwards bank SMS to Telegram bot
2. n8n workflow parses SMS → saves to PostgreSQL
3. User opens Telegram Web App → React app loads
4. React app fetches data from .NET Minimal API
5. API reads from PostgreSQL database
6. User asks AI questions → triggers n8n AI workflow

**Component Responsibilities:**
- **n8n workflows**: SMS parsing, AI chat responses
- **.NET Minimal API**: CRUD operations, transaction management (REST endpoints)
- **React Web App**: UI, analytics, transaction display
- **PostgreSQL**: Single source of truth for all data

**Key Decisions:**
- No caching layer (Redis) - keep it simple with database only
- Standard REST API design
- Periodic refresh for MVP (no real-time updates needed)

## Data Model

**Core Tables:**
```sql
-- Users (from Telegram)
Users: id, telegram_id, username, created_at

-- Transactions (parsed from SMS)
Transactions: id, user_id, date, amount, note, category_id (FK), 
              tags (string array), currency, sms_text, message_id, created_at

-- Categories (predefined global set)
Categories: id, name, type (income/expense), created_at
```

**MVP Decisions:**
- Single bank account per user
- Predefined global categories (user can extend list later)
- Single currency: AED
- User-specific data isolation
- Date-based filtering and analytics

**Predefined Categories:**
[Space reserved for category definitions]

## LLM Integration

**Current Setup:**
- LLM integration already handled by existing n8n workflow
- "Talk to your money" feature implemented in n8n
- No additional LLM integration needed in .NET API

**Integration Points:**
- React Web App has dedicated AI Chat screen
- Chat screen communicates directly with n8n AI workflow via webhook
- n8n workflow has access to PostgreSQL for transaction data analysis

**MVP Approach:**
- Keep existing n8n LLM implementation
- Simple chat interface in React (current conversation only)
- Simple user-friendly error message if n8n workflow unavailable
- Basic chat UI with standard components

## LLM Monitoring

**MVP Approach:**
- Rely on n8n's built-in workflow monitoring
- Basic error logging in React app when AI chat fails
- Simple error logging in .NET API when n8n webhooks fail
- No usage metrics, rate limiting, or alerting for MVP

## Usage Scenarios

**Primary User Journey:**
1. **SMS Processing**: User forwards bank SMS to Telegram bot → Transaction automatically saved
2. **View Transactions**: User opens Telegram Web App → sees transaction list with advanced filters
3. **Manage Transactions**: User can edit/delete transactions, change categories/tags
4. **Analytics**: User views spending trends, category breakdown, tags breakdown
5. **AI Chat**: User asks "How much did I spend on food this month?" → Gets AI response

**MVP Screens:**
- **Dashboard**: Recent transactions + basic stats
- **Transactions**: Full list with filters (date, amount <,>,=, tag, category)
- **Analytics**: Spending trends, category breakdown, tags breakdown
- **AI Chat**: "Talk to your money" interface
- **Transaction Detail/Edit**: Edit/delete operations only

**MVP Decisions:**
- Transaction creation: Only via SMS forwarding (no manual entry)
- Filtering: Date range, amount operators, tags, categories
- No export functionality for MVP

## Deployment

**MVP Deployment:**
- Single AWS EC2 instance
- Docker Compose for orchestration
- All services on one machine

**Services:**
- PostgreSQL (Docker container)
- .NET Minimal API (Docker container) 
- React Web App (served via Nginx)
- n8n (your existing setup)

**Setup:**
- AWS EC2 instance with Docker
- Nginx reverse proxy with SSL (Let's Encrypt)
- Basic PostgreSQL backup strategy
- Simple GitHub Actions CI/CD pipeline

**Deployment Flow:**
1. Push to main branch
2. GitHub Actions builds Docker images
3. Deploy to EC2 via SSH
4. Docker Compose restart services

## Configuration Approach

**Single Environment (Production):**
- Environment variables for all configuration
- No dev/staging complexity for MVP

**Configuration:**
- Database connection string (env var)
- Telegram bot settings (env var)
- n8n webhook URLs (env var)
- API keys/secrets (env var)

**Files:**
- `appsettings.json` for .NET API defaults
- `.env` file for Docker Compose
- React build-time environment variables

**MVP Approach:**
- Single production configuration
- Environment variables only (no Docker secrets)
- Default values in code where possible

## Logging Approach

**MVP Logging:**
- Built-in .NET logging (ILogger)
- Console output for Docker containers
- Basic error logging in React (console.error)

**Log Events:**
- Transaction created/updated/deleted
- API request errors
- Database connection issues
- n8n webhook failures

**Log Levels:**
- Error: API failures, database errors
- Info: Transaction CRUD operations
- Debug: Development only

**Simple Approach:**
- Docker container logs only (no external services)
- Basic error boundaries in React
- No user action logging in frontend