# ADR-001: Technology Stack Selection

## Status
Accepted

## Context
We need a practical stack for a Telegram-based money tracking app with transaction CRUD, analytics, and AI chat integration.

## Decision
We use:
- **SMS Processing & AI Chat**: existing n8n workflows
- **Backend API**: Python FastAPI (`backend_new`) with Piccolo ORM
- **Frontend**: React + TypeScript + Material-UI + Telegram Web App SDK
- **Database**: PostgreSQL (shared between n8n and backend API)
- **Containerization**: Docker Compose
- **Deployment**: Single AWS EC2 instance with Nginx reverse proxy

## Rationale
- n8n already handles SMS/AI workloads.
- FastAPI + Piccolo keeps backend simple and typed.
- React + MUI remains productive and familiar.
- PostgreSQL is reliable and shared across components.
- Docker Compose keeps local and production topology consistent.

## Consequences
- Clear boundary: n8n handles workflows, backend handles API contract.
- Single-server deployment minimizes operational overhead.
- Monolithic backend keeps iteration speed high.

## Date
2026-03-20
