# ADR-004: Data Model Design

## Status
Accepted

## Context
We need to define a simple data model that supports transaction tracking, categorization, and user management while keeping the MVP focused and extensible.

## Decision
Core tables:
```sql
-- Users (from Telegram)
Users: id, telegram_id, username, created_at

-- Transactions (parsed from SMS)
Transactions: id, user_id, date, amount, note, category_id (FK), 
              tags (string array), currency, sms_text, message_id, created_at

-- Categories (predefined global set)
Categories: id, name, type (income/expense), created_at
```

MVP constraints:
- Single bank account per user
- Predefined global categories (extensible later)
- Single currency: AED
- User-specific data isolation
- String array for tags (PostgreSQL native support)

## Rationale
- **Single account**: Simplifies MVP, most users have one primary account
- **Global categories**: Reduces initial complexity, can be user-specific later
- **AED currency**: Target market constraint, avoids currency conversion
- **Tags as array**: PostgreSQL native support, flexible categorization
- **SMS fields**: Preserves original data for debugging/reprocessing

## Consequences
- Simple queries and relationships
- Easy to implement CRUD operations
- Limited to single account initially
- Categories shared across users (may need user preferences later)
- Full SMS text preserved for future improvements

## Date
2024-08-31