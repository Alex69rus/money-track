# ADR-009: SSL Certificate Strategy

## Status
Accepted

## Context
Our initial deployment strategy included Let's Encrypt certificates with ACME challenges, but this created operational complexity and deployment failures:

- nginx would crash on startup if SSL certificates didn't exist yet
- ACME challenges required nginx to be running to serve challenge responses
- Classic "chicken-and-egg" problem: need nginx running to get certificates, need certificates to start nginx
- Additional complexity with certbot containers and automatic renewal logic
- Deployment failures due to timing issues between certificate acquisition and nginx startup

Given that we already use Cloudflare as our DNS provider and CDN proxy, we have a simpler alternative available.

## Decision
**Switch from Let's Encrypt to Cloudflare Origin Certificates for SSL.**

Implementation approach:
- **Cloudflare Origin Certificates**: 15-year validity, no renewal needed
- **Static certificate deployment**: Certificates stored as GitHub secrets and deployed via CI/CD
- **Simplified nginx configuration**: Direct certificate file references, no ACME endpoints
- **Cloudflare "Full (Strict)" SSL mode**: End-to-end encryption with certificate validation
- **GitHub Actions integration**: Automated certificate deployment as part of CI/CD pipeline

Certificate management:
- Generate Cloudflare Origin Certificate via Cloudflare dashboard
- Store certificate and private key as GitHub repository secrets (`CLOUDFLARE_CERT`, `CLOUDFLARE_KEY`)
- Deploy certificates to `/opt/money-track/ssl/` directory during GitHub Actions deployment
- Mount certificates into nginx container as read-only volumes

## Rationale
**Simplicity advantages:**
- Eliminates chicken-and-egg SSL startup problem
- No additional containers (certbot) required
- No automatic renewal logic needed (15-year validity)
- Immediate certificate availability during deployment

**Reliability advantages:**
- No dependency on ACME challenge timing
- No nginx startup failures due to missing certificates
- Reduced deployment complexity and failure points
- Leverages existing Cloudflare infrastructure

**Security advantages:**
- End-to-end encryption maintained with "Full (Strict)" mode
- Certificates trusted by Cloudflare edge servers
- Same security posture as Let's Encrypt with simpler management

**Cost advantages:**
- No additional costs (Cloudflare certificates are included)
- Reduced operational overhead
- Fewer moving parts to maintain

## Consequences
**Positive:**
- Simplified deployment pipeline with fewer failure points
- Faster deployment times (no certificate acquisition wait)
- Reduced operational complexity
- Leverages existing Cloudflare relationship
- 15-year certificate validity eliminates renewal concerns

**Negative:**
- Vendor lock-in to Cloudflare (acceptable given existing usage)
- Certificates only trusted by Cloudflare (not a concern for our use case)
- Manual certificate regeneration needed after 15 years (acceptable timeline)

**Migration required:**
- Remove certbot container and related volumes from docker-compose.prod.yml
- Update nginx configuration to use static certificate paths
- Remove ACME challenge location blocks from nginx config
- Update GitHub Actions deployment script to deploy Cloudflare certificates
- Update documentation to reflect new certificate management approach

## Alternative Considered
**Let's Encrypt with staging approach**: Deploy HTTP-only nginx first, acquire certificates, then switch to HTTPS. This was rejected due to added complexity and potential race conditions.

## Date
2024-09-19