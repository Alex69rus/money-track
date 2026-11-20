# Production NGINX HTTP/2 exposure — 2026-11-20

## BR-032 — Internet-reachable NGINX uses an affected HTTP/2 build

Priority: P0. State: Fixed — verification pending.

Evidence: DigitalOcean's NGINX HTTP/2 security alert from 2026-11-20. [NGINX security advisories](https://nginx.org/en/security_advisories.html), [F5 CVE-2026-123007](https://my.f5.com/s/article/K000163926), [F5 CVE-2026-123633](https://my.f5.com/s/article/K000163928).

### Actual

- On EC2 at deployment revision `d560781`, the edge container runs `nginx/1.29.1` (`linux/arm64`, image tag `nginx:alpine`, manifest digest `sha256:42a516af16b852e33b7682d5ef8acbd5d13fe08fecadc7ed98605ba5e3b26ab8`). Its configuration test succeeds and shows `listen 443 ssl`, `http2 on`, and nine `proxy_pass` directives.
- Ordinary HTTPS `GET /health` returned 200 through Cloudflare and directly from the EC2 origin from the review client. The exact AWS Security Group rules and Cloudflare HTTP/2 to Origin setting were unavailable for inspection.
- The frontend container runs `nginx/1.27.5` and its effective configuration listens on port 80 with HTTP/2 disabled.
- The edge container showed zero container restarts and no worker crash or segmentation-fault matches in its retained Docker logs since 2026-11-18 UTC. This check had limited coverage of potential compromise.

### Expected

The public reverse proxy runs an official build with both CVE fixes. Deployments select an explicit reviewed image and verify the running build.

### Verification procedure

1. On EC2, run `nginx -v` in the `nginx` service using the production Compose file with the installed `docker-compose` binary. Inspect the container image digest and inspect applicable `listen`, `http2`, and `proxy_pass` directives with `nginx -T`.
2. Request `/health` using ordinary HTTPS through the public domain and directly from an authorized client to verify the intended origin access policy.

### Acceptance criteria

- The running edge image is an official build containing both fixes, with the recorded version and image digest.
- NGINX configuration validation, `/health`, and the frontend `/version.json` succeed after deployment.
