# Money Track - Technical Vision

## 1. Technologies

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

## 2. Development Principles

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

## 3. Project Structure

```
money-track/
├── backend/                    # Single .NET Minimal API project
│   ├── Endpoints/             # Minimal API endpoints
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

## 4. Project Architecture

**System Overview:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Telegram User  │────│  Telegram Bot   │────│      n8n        │
│                 │    │                 │    │   Workflows     │
└─────────────────┘    └─────────────────┘    └─────────┬───────┘
                                                        │
                                              ┌─────────▼───────┐
                                              │                 │
                                              │   PostgreSQL    │
                                              │    Database     │
                                              │                 │
                                              └─────────▲───────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────┴───────┐
│                 │    │                 │    │                 │
│ Telegram Web App│◄───│   React UI      │◄───│  .NET Minimal   │
│   (Browser)     │    │   (Frontend)    │    │      API        │
│                 │    │                 │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

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

## 5. Data Model

**Core Tables:**
```sql
-- Transactions (parsed from SMS)
-- Note: user_id is now BIGINT storing Telegram user ID directly (no Users table)
Transactions: id, user_id (BIGINT), transaction_date, amount, note (optional), category_id (FK) (optional), 
              tags (string array) (optional), currency, sms_text (optional), message_id (optional), created_at

-- Categories (predefined global set: 'Medical Services','Education','Beauty','Clothing & Shoes','Furniture','Charity','Taxis','Savings interests','Maintenance & Renovation','Kids','Utility','Healthcare','Internet-Services','Entertainment','Communication','Medicines','Baby Clothes','Accessories & Toys','Luda's job','Groceries','Gifts','Home','Rent','Alcohol','Public transport','Pets','Carsharing','Rus transfer','Etc.','Apique salary Transfer from USD','Veterinary Services','Car','Fuel','Classes','Parking & Toll roads','Toys','Household Goods','Eating Out','Hotel','Travel','Tickets','Car Wash','Cellular','Apique salary','Hardware','Luda's income','Other income','Legalisation','Pet Food')
Categories: id, name, type (income/expense), color, icon, parent_category_id, order_index, created_at
```

**MVP Decisions:**
- Single bank account per user
- Predefined global categories (user can extend list later)
- Single currency: AED
- User-specific data isolation
- Date-based filtering and analytics

**Enhanced Features:**
- Categories ordered by order_index field and grouped by parent_category_id
- Tag autocomplete with existing tag suggestions from database
- Search functionality in category selectors for improved UX
- Quick category/tag selection directly from transaction list view
- Date range filtering for analytics components

**Predefined Categories:**
[Space reserved for category definitions]

## 6. LLM Integration

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

## 7. LLM Monitoring

**MVP Approach:**
- Rely on n8n's built-in workflow monitoring
- Basic error logging in React app when AI chat fails
- Simple error logging in .NET API when n8n webhooks fail
- No usage metrics, rate limiting, or alerting for MVP

## 8. Usage Scenarios

**Primary User Journey:**
1. **SMS Processing**: User forwards bank SMS to Telegram bot → Transaction automatically saved
2. **Open App**: User opens Telegram Web App → lands directly on transactions list with advanced filters
3. **Search Transactions**: User can search transactions by typing text to match amount, note, tags, or category name
4. **Manage Transactions**: User can edit/delete transactions, change categories/tags
5. **Set transaction category and tags manually quickly**: User on the view transactions screen quickly can select category and/or tags for transaction without opening its details view
6. **Enhanced Category Selection**: User searches for categories in dropdown for quick selection
7. **Smart Tag Management**: User gets tag suggestions based on existing tags when adding new ones
8. **View Analytics**: User navigates to analytics tab to view spending trends, category breakdown, tags breakdown with custom date ranges
9. **AI Chat**: User asks "How much did I spend on food this month?" → Gets AI response

**MVP Screens:**
- **Transactions** (Default/Home): Full list with filters (date, amount <,>,=, tag, category) + text search + quick category/tag selection
- **Analytics**: Spending trends, category breakdown, tags breakdown + date range filtering
- **AI Chat**: "Talk to your money" interface
- **Transaction Detail/Edit**: Edit/delete operations with enhanced category search and tag autocomplete

**MVP Decisions:**
- Transaction creation: Only via SMS forwarding (no manual entry)
- Filtering: Date range, amount operators, tags, categories
- Search: Text-based search across amount, note, tags, category name
- No export functionality for MVP

## 9. Deployment

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

## 10. Configuration Approach

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

## 11. Logging Approach

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