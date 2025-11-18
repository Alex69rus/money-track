# Development Conventions

> These conventions implement the development principles defined in [vision.md](./vision.md). Follow these rules when generating code for the Money Track project.

## Core Rules

1. **KISS & YAGNI**: Write the simplest code that works. Don't add features until needed.
2. **Framework Conventions**: Use .NET and React defaults. No custom configurations unless required.
3. **MVP Focus**: Build only what's defined in [vision.md](./vision.md) Usage Scenarios.

## .NET Backend Conventions

- **Minimal API**: Use built-in endpoints, no controllers
- **Single Assembly**: Keep all code in one project (Models/, Services/, Data/)
- **Entity Framework**: Standard conventions, no complex mappings
- **Validation**: Data annotations only, no FluentValidation
- **Logging**: ILogger with simple Info/Error levels
- **No Abstractions**: Direct service injection, no repository pattern
- **Async methods**: Write async API if possible by default
- **EmptyCollection Initializations**: Use '[]' initializer instead of 'Array.Empty<T>()'
- **Search API**: Single search endpoint returning filtered transactions, case-insensitive matching

## React Frontend Conventions

- **TypeScript**: Required for all components and services
- **Material-UI**: Use standard components, minimal customization
- **Function Components**: No class components
- **Simple State**: useState/useEffect only, no complex state management
- **API Calls**: Direct fetch calls in services/, no axios or complex HTTP clients
- **Telegram Web App**: Use official SDK methods only
- **Search Implementation**: Simple text search with debouncing, search icon placement to the right of filters

## Database Conventions

- **PostgreSQL**: Standard types, use arrays for tags
- **Migrations**: EF Core migrations from the .net BE
- **No ORM Magic**: Explicit Entity Framework configurations: `IEntityTypeConfiguration<T>`
- **Primary Keys**: If primary key is auto increment number it should be long (not int)
- **Foreign Keys**: Standard FK relationships, no complex joins explicitly specified in the EF Entity Configuration files

## Testing Conventions

- **Unit Tests**: Critical business logic only (transaction CRUD)
- **No Integration Tests**: Keep it simple for MVP
- **Standard Test Projects**: xUnit for .NET, Jest for React (if needed)

## Code Style

- **Auto-formatting**: Prettier for React, .NET defaults
- **No Custom Rules**: Use language/framework defaults
- **Minimal Comments**: Only for complex business logic

## Architecture Adherence

- **Database First**: All data operations through Entity Framework
- **No Caching**: Direct database queries only
- **Environment Variables**: All configuration via env vars

## NEVER DO
- Microservices of complex architecture
- Complex config files (YAML, JSON)
- Excess abstractions and classes
- Full text coverage
- Complex monitoring systems

## DO
- simple methods and minimum of abstractions
- single file - single responsibility
- clear and neat names for variables and methods
- base logging of all operations
- base erors handling
- Documentation for API functions