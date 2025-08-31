# ADR-003: Project Structure

## Status
Accepted

## Context
We need to define a simple, clear project structure that supports our monolithic .NET API and React frontend without unnecessary complexity.

## Decision
We will use this structure:
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
├── docs/
│   └── adr/                 # Architecture Decision Records
└── docker-compose.yml        # Local development setup
```

## Rationale
- **Single .NET assembly**: Monolithic approach reduces complexity for MVP
- **Simple folder organization**: Models, Services, Data follow .NET conventions
- **Standard React structure**: Components, pages, services are familiar patterns
- **Separate database folder**: SQL migrations can be version controlled
- **No shared types**: Avoids premature abstraction between frontend/backend

## Consequences
- Easy to navigate and understand
- Follows framework conventions
- Single assembly simplifies deployment
- May need refactoring if project grows significantly
- No complex build orchestration needed

## Date
2024-08-31