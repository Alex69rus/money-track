# ADR-001: Technology Stack Selection

## Status
Accepted

## Context
We need to select technologies for a money tracking Telegram bot and web app MVP that processes bank SMS messages and provides transaction analytics with AI chat functionality.

## Decision
We will use:
- **SMS Processing & AI Chat**: Existing n8n workflows
- **Backend API**: .NET Minimal API (single assembly, monolithic)
- **Frontend**: Create React App + Material-UI + Telegram Web App SDK
- **Database**: PostgreSQL (shared between n8n and .NET API)
- **Containerization**: Docker Compose for development and deployment
- **Deployment**: Single AWS EC2 instance

## Rationale
- **n8n workflows**: Already implemented SMS parsing and AI chat functionality
- **.NET Minimal API**: Simple, performant, follows KISS principle with single assembly
- **React + MUI**: Standard, well-documented, good Telegram Web App support
- **PostgreSQL**: Reliable, already used by n8n workflows
- **Docker**: Consistent deployment, easy local development
- **AWS EC2**: Cost-effective for MVP, familiar platform

## Consequences
- Clean separation: n8n handles SMS/AI, .NET API serves UI requests
- Both systems share same PostgreSQL database
- Single server deployment keeps costs low
- Standard tech stack reduces learning curve
- Monolithic .NET API simplifies initial development

## Date
2024-08-31