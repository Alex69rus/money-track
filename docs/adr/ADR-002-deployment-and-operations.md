# ADR-002: Deployment and Operations

## Status

Accepted

## Context

Money Track needs a low-complexity deployment model with explicit configuration, repeatable delivery, and secure TLS termination.

## Decision

- Deploy the application on a single AWS EC2 instance using Docker Compose.
- Run PostgreSQL, the FastAPI backend, the React frontend, and Nginx as the application runtime.
- Use GitHub Actions to validate, build, publish, and deploy backend and frontend images.
- Keep runtime configuration in environment variables. The backend centralizes settings in `backend_new/app/core/config.py`; the frontend uses Vite build-time variables; Compose reads `.env` or `.env.prod`.
- Store production secrets in GitHub Actions secrets and generate the production environment file during deployment.
- Use Nginx for routing, TLS termination, and serving the frontend.
- Use Cloudflare Origin Certificates with Cloudflare **Full (strict)** mode. Deploy the certificate and private key from protected CI secrets and mount them read-only into Nginx.
- Do not use ACME or certificate-renewal containers.

## Rationale

- Docker Compose and one server keep the operational model proportionate to the current product scale.
- Environment-based configuration makes local and production topology explicit without hard-coded secrets.
- GitHub Actions provides a reproducible path from validated source to deployed images.
- Cloudflare Origin Certificates eliminate certificate-acquisition and renewal timing from the deployment path while preserving encrypted origin traffic.

## Consequences

- The application has a single-server failure domain, accepted for the current stage.
- Production deployment depends on Docker, GitHub Container Registry, GitHub Actions secrets, and Cloudflare.
- Certificate rotation is a deliberate deployment operation rather than an automatic renewal process.
- Changes to hosting, configuration strategy, CI/CD delivery, or TLS termination belong in this ADR.

## Date

2026-07-18
