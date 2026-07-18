# Money Track - Technical Vision

## 1. Technologies

- **Telegram Ingestion & AI Processing**: Python FastAPI (`backend_new`) receives Telegram updates, parses SMS messages, and suggests transaction categories
- **Backend API**: Python FastAPI (`backend_new`) for UI requests and transaction CRUD
- **Frontend**: React + TypeScript + Vite + Tailwind v4 + shadcn/ui + Telegram Web App SDK (`frontend_new`)
- **Database**: PostgreSQL
- **Authentication**: Telegram Web App built-in auth (validate initData hash)
- **API Security**: UI -> backend API via Telegram initData validation
- **Containerization**: Docker Compose for local development
- **Deployment**: Single VPS with Docker

Clean separation:
- Python backend owns Telegram ingestion, AI-assisted SMS processing, and the React UI API
- React Web App owns the user interface, analytics presentation, and transaction management flows
- PostgreSQL is the system of record

## 2. Development Principles

**Core Principles:**
- **KISS (Keep It Simple, Stupid)** - Simplest solution that works
- **YAGNI (You Aren't Gonna Need It)** - Don't build features until needed
- **MVP First** - Build minimal viable features, iterate based on feedback
- **No Premature Optimization** - Optimize only when needed
- **Convention over Configuration** - Use framework defaults where possible
- **Fail Fast** - Quick feedback loops, early error detection

**Development Practices:**
- Simple main + feature branch workflow
- Practical tests for business-critical behavior
- Follow framework conventions (FastAPI/Piccolo for backend, Prettier for React)
- Document non-obvious architecture and operational decisions

## 3. Project Structure

```text
money-track/
├── backend_new/               # Python FastAPI backend
│   ├── app/                   # API routes, schemas, services, DB/core
│   ├── tests/                 # Integration tests and fixtures
│   ├── piccolo_migrations/    # Migration scripts
│   └── pyproject.toml
├── frontend_new/              # React Telegram Mini App
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── types/
├── docs/
│   └── adr/
└── docker-compose.yml
```

## 4. Project Architecture

**System Overview:**
```text
Telegram User -> Telegram Bot -> FastAPI -> PostgreSQL <- React Web App (Telegram Web App)
```

**Data Flow:**
1. User forwards bank SMS to Telegram bot.
2. FastAPI parses the SMS, stores the transaction in PostgreSQL, and replies with category actions.
3. User opens Telegram Web App.
4. React app calls FastAPI endpoints.
5. FastAPI reads/writes PostgreSQL.

**Component Responsibilities:**
- FastAPI backend: Telegram webhook handling, SMS parsing, category suggestion, transaction/category/tag APIs, and auth validation
- React Web App: UI, analytics, transaction management
- PostgreSQL: single source of truth

## 5. Data Model

**Core Tables:**
- `transactions`: `id`, `user_id` (BIGINT), `transaction_date`, `amount`, `note`, `category_id`, `tags` (`text[]`), `currency`, `sms_text`, `message_id`, `created_at`
- `categories`: `id`, `name`, `type`, `color`, `icon`, `parent_category_id`, `order_index`, `created_at`

Categories predefined global set: 'Medical Services','Education','Beauty','Clothing & Shoes','Furniture','Charity','Taxis','Savings interests','Maintenance & Renovation','Kids','Utility','Healthcare','Internet-Services','Entertainment','Communication','Medicines','Baby Clothes','Accessories & Toys','Luda's job','Groceries','Gifts','Home','Rent','Alcohol','Public transport','Pets','Carsharing','Rus transfer','Etc.','Apique salary Transfer from USD','Veterinary Services','Car','Fuel','Classes','Parking & Toll roads','Toys','Household Goods','Eating Out','Hotel','Travel','Tickets','Car Wash','Cellular','Apique salary','Hardware','Luda's income','Other income','Legalisation','Pet Food'

**MVP Decisions:**
- Single currency: AED
- User isolation via `user_id`
- Predefined global categories
- Date-based filtering and analytics

**Enhanced Features:**
- Categories ordered by order_index field and grouped by parent_category_id
- Tag autocomplete with existing tag suggestions from database
- Search functionality in category selectors for improved UX
- Quick category/tag selection directly from transaction list view
- Date range filtering for analytics components

**Predefined Categories:**
[Space reserved for category definitions]

## 6. AI Integration

- The backend owns all current LLM integrations.
- OpenAI structured output is used for SMS transaction extraction and category suggestion.
- LLM integrations use backend configuration and do not bypass the product API.

## 7. Usage Scenarios

1. User forwards bank SMS -> transaction is stored.
2. User opens app -> lands on transaction list.
3. User searches and filters transactions.
4. User edits/deletes transactions and updates categories/tags.
5. User checks analytics with date range filters.
6. User receives an AI-assisted category suggestion after a parsed SMS transaction is saved.

## 8. Deployment

- Single EC2/VPS deployment with Docker Compose.
- Services: PostgreSQL, FastAPI backend, React frontend, and Nginx.
- CI/CD via GitHub Actions.
- SSL via Cloudflare Origin Certificates.

## 9. Configuration and Logging

- Runtime config through environment variables.
- Backend settings are centralized in `backend_new/app/core/config.py`.
- Logging is standard container + app logs with info/error focus.
