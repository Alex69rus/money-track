# ADR-006: LLM Integration Strategy

## Status
Accepted

## Context
We need to integrate AI-powered chat functionality ("Talk to your money") while leveraging existing n8n workflows and keeping the implementation simple.

## Decision
LLM integration approach:
- **Use existing n8n workflows**: SMS parsing and AI chat already implemented
- **No .NET API LLM integration**: Keep LLM logic in n8n
- **Direct frontend-to-n8n communication**: React app calls n8n webhooks directly
- **Minimal monitoring**: Basic error logging only

Implementation details:
- React Web App has dedicated AI Chat screen
- Chat communicates directly with n8n AI workflow via webhook
- n8n workflow accesses PostgreSQL for transaction data analysis
- Current conversation only (no chat history persistence)
- Simple error messages if n8n unavailable

## Rationale
- **Leverage existing work**: n8n workflows already functional
- **Separation of concerns**: n8n handles AI, .NET API handles CRUD
- **Simplicity**: No duplicate LLM integration in multiple services
- **Direct communication**: Reduces latency and complexity

## Consequences
- Clean separation between transaction management and AI features
- Dependency on n8n availability for AI functionality
- No complex prompt engineering needed in .NET API
- Simple error handling and user experience
- Future extensibility through n8n workflow updates

## Date
2024-08-31