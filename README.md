# Money Track

Personal money tracking application with Telegram bot integration.

## Architecture

- **Backend**: .NET Minimal API with Entity Framework and PostgreSQL
- **Frontend**: React TypeScript with Material-UI
- **Database**: PostgreSQL
- **Containerization**: Docker Compose

## Quick Start

1. Clone the repository
2. Start all services:

```bash
docker-compose up --build
```

3. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **API Documentation**: http://localhost:5000/swagger

## Development

### Prerequisites
- Docker and Docker Compose
- .NET 8 SDK (for local development)
- Node.js 18+ (for local development)

### Health Check
- Backend health: http://localhost:5000/health
- Should return "OK"

## Project Structure

```
money-track/
├── backend/                 # .NET Minimal API
│   ├── Models/             # Data models & DTOs
│   ├── Services/           # Business logic
│   ├── Data/              # Database context
│   └── Program.cs         # Main entry point
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Main app screens
│   │   ├── services/     # API calls
│   │   └── types/       # TypeScript types
└── docker-compose.yml     # Local development setup
```

## Next Steps

This is Iteration 1 setup. Next iterations will add:
- Database models and Entity Framework
- Transaction CRUD API endpoints
- Frontend routing and components
- Analytics and AI chat integration