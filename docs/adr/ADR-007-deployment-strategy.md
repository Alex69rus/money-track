# ADR-007: Deployment Strategy

## Status
Accepted

## Context
We need a low-complexity production deployment model for the current stack.

## Decision
Deployment approach:
- Single AWS EC2 instance
- Docker Compose orchestration
- GitHub Actions CI/CD for build and deploy
- Nginx reverse proxy for routing and TLS termination

Runtime services:
- PostgreSQL
- Python FastAPI backend (`backend_new` image)
- React frontend image
- n8n
- Nginx

## Rationale
- Keeps operations simple and cost-effective.
- Matches current system scale and team bandwidth.

## Consequences
- Single point of failure remains acceptable at current stage.
- Operational model is straightforward and reproducible.

## Date
2026-03-20
