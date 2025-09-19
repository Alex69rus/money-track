# ADR-007: Deployment Strategy

## Status
Accepted

## Context
We need a simple, cost-effective deployment strategy for MVP that supports Docker containers and allows for easy updates while minimizing operational complexity.

## Decision
Deployment approach:
- **Single AWS EC2 instance**: All services on one machine
- **Docker Compose orchestration**: Container management
- **GitHub Actions CI/CD**: Simple automated deployment
- **Nginx reverse proxy**: SSL termination and routing

Setup details:
- AWS EC2 instance with Docker installed
- PostgreSQL, .NET API, React app (via Nginx) in containers
- n8n in existing setup
- Cloudflare Origin Certificates for SSL (see ADR-009)
- Basic PostgreSQL backup strategy

Deployment flow:
1. Push to main branch triggers GitHub Actions
2. Build and push Docker images
3. SSH to EC2 and restart Docker Compose services
4. Health checks verify deployment

## Rationale
- **Single server**: Cost-effective for MVP, simple to manage
- **Docker Compose**: Familiar, reliable container orchestration
- **GitHub Actions**: Free tier sufficient, simple pipeline
- **AWS EC2**: Reliable, scalable when needed

## Consequences
- Low operational overhead
- Single point of failure (acceptable for MVP)
- Easy to scale vertically initially
- Simple backup and recovery process
- Cost-effective for testing and validation

## Date
2024-08-31