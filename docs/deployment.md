# Production deployment

Merges to `main` run [the production workflow](../.github/workflows/deploy.yml). It validates `frontend_new`, builds ARM64 images, and deploys the exact frontend image built from that commit.

## Workflow stages

- A pull request targeting `main` runs frontend and backend validation only.
- A push to `main` additionally builds and publishes ARM64 frontend and backend images to GHCR, then deploys to `/opt/money-track` over SSH.
- The deployment selects the immutable `frontend-new:<full-commit-sha>` image. The backend service continues to use the freshly pulled `backend:latest` image.

Frontend quality checks run once in `deploy.yml` (`validate-frontend`), including a production Docker build check. The frontend Dockerfile builds static assets on `$BUILDPLATFORM` so Node, TypeScript, and Vite run natively even when publishing an ARM64 nginx image from an x86 runner. Keep the runtime stage on the target platform. The frontend Actions cache uses `mode=max` to retain intermediate dependency and build layers; the single-stage backend keeps `mode=min`.

Local development, frontend CI, and the frontend Docker build use Node 26.13.1 (`.nvmrc`, `actions/setup-node`, and `node:26.13.1-alpine` respectively); both package manifests require Node `>=26.13.1 <27`, and `.nvmrc` selects the Node release that bundles npm 11.20.0. The `packageManager` metadata records npm 11.20.0 but does not switch the npm binary by itself. `actions/setup-node@v7` runs its own action code on Node 24 while selecting Node 26 for project steps. Node runs build and QA tools only—the deployed frontend remains nginx, and this does not set the Telegram WebView's Node or browser capabilities. To roll back, restore the previous known-good image/commit and revert the Node declarations together, then rerun the frontend gates before publishing.

The server-side deployment script generates `.env.prod` and the Cloudflare Origin Certificate files from GitHub configuration; do not create or commit a production `.env.prod` file in the repository.

## Frontend deployment and rollback

Production serves the `frontend` Compose service from `ghcr.io/alex69rus/money-track/frontend-new`. The service uses only immutable `frontend-new:<full-commit-sha>` images.

The frontend image is built with an empty `VITE_API_BASE_URL`. That is intentional: browser requests remain same-origin and nginx forwards `/api/*` to the backend. No Vite API URL secret or Actions variable is required.

Every deployment uses `frontend-new:<full-commit-sha>`, creates `/version.json` with that revision, and verifies all of the following before succeeding:

- the expected revision is served through HTTPS;
- `/transactions` receives the SPA shell rather than a 404;
- `/health` succeeds through nginx;
- the running `frontend` container uses the expected immutable image;
- the default Telegram Web App menu button points to the production domain.

Before replacing the frontend, the server saves `/opt/money-track/.env.prod.previous` and records the running frontend image digest. If the new frontend revision or route check fails, the workflow recreates only the `frontend` service with the saved `frontend-new` image.

## Nginx routing and restart order

Pin the outer Nginx image in `docker-compose.prod.yml` and the frontend runtime image in `frontend_new/Dockerfile` to the reviewed official image tag and multi-platform digest. Compose downloads the pinned proxy image when that digest is missing locally. The workflow verifies the running image ID, logs the binary version, and checks the configuration after deployment. Confirm each new pin includes `linux/arm64` for production.

Production mounts only [nginx/conf.d/default.conf](../nginx/conf.d/default.conf). The local [dev.compose.conf](../nginx/conf.d/dev.compose.conf) and [test.conf](../nginx/conf.d/test.conf) are intentionally not loaded: the development configuration proxies to `host.docker.internal`, which is unavailable on the production Linux host.

Nginx resolves Docker service hostnames when it starts. After the workflow recreates `backend` and `frontend`, it recreates Nginx so the proxy uses their fresh container addresses. The automated frontend rollback follows the same order: recreate the frontend, then recreate Nginx. Do not mount the entire `nginx/conf.d` directory in production or omit the Nginx recreation step.

## Required GitHub configuration

Configure the following repository secrets. The workflow stops before deployment if a required value is empty.

```text
SERVER_HOST
SERVER_USER
SSH_PRIVATE_KEY
CLOUDFLARE_CERT
CLOUDFLARE_KEY
POSTGRES_PASSWORD
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
N8N_ENCRYPTION_KEY
```

`OPENAI_API_KEY` is optional. `OPENAI_MODEL` may be an Actions variable or secret and defaults to `gpt-4.1-mini`.

Configure these Actions variables (secrets also work for compatibility):

```text
DOMAIN=money-track.org
TELEGRAM_WEBHOOK_URL=https://money-track.org/api/telegram/webhook
```

### Backend telemetry in New Relic

OTLP export is off by default. Set these values in the repository's GitHub
**Settings → Secrets and variables → Actions** so the deploy job can read them.

| Name | Actions setting | Value |
| --- | --- | --- |
| `NEW_RELIC_LICENSE_KEY` | Repository secret | New Relic **Ingest - License** key for the destination account |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Repository variable | HTTPS base URL for the account's region on port 443, such as `https://otlp.nr-data.net` (US) or `https://otlp.eu01.nr-data.net` (EU) |
| `OTEL_TRACES_EXPORTER` | Repository variable | `otlp` |
| `OTEL_LOGS_EXPORTER` | Repository variable | `otlp` |

Use the base URL without `/v1/traces` or `/v1/logs`. The application adds
those paths. The next push to `main` triggers the production workflow,
which writes the values into `.env.prod` on EC2. Agents SDK chat tracing
uses the existing `OPENAI_API_KEY`.
[New Relic OTLP endpoints and limits](https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/)

The deployment sets `BACKEND_LOG_DRIVER=local` for the backend when OTLP logs
are enabled. This setting is derived by the workflow. The host agent's
`/var/lib/docker/containers/*/*.log` rule then
skips the backend's local-driver files. `docker compose logs backend` still
shows stdout and stderr, including migrations and exporter diagnostics.
The OTLP bridge sends application and Uvicorn logs. Other containers keep
their current logging configuration.
[Docker local logging driver](https://docs.docker.com/engine/logging/drivers/local/)

After deployment, use synthetic data to run one chat with a tool call and one
Telegram SMS that reaches the parser and categorization. In New Relic, filter
`Span` and `Log` by `service.name = 'money-track-backend'`. Check the
request-to-model span tree, follow a trace to its logs, and search for the
synthetic SMS to check for duplicate records. Check the AI Monitoring view for
standard GenAI spans and Distributed Tracing for Decisions. Agents SDK chat
traces also go to OpenAI. Both exporters remove credentials from trace payloads.
New Relic may truncate individual span attributes over 4,095 characters.

To roll back export, set both Actions exporter variables to `none` and run
the production deployment from `main` with the updated variables. This also
restores `json-file` forwarding for the backend. Agents SDK chat traces continue
to go to OpenAI.

The workflow derives these production-only backend settings from `DOMAIN`; do not point them to a development tunnel:

```text
TELEGRAM_WEB_APP_URL=https://money-track.org/
CORS_ALLOW_ORIGINS=https://money-track.org
```

The job logs into GHCR using the repository token. Ensure the `frontend-new` package remains linked to this repository and grants GitHub Actions read access; otherwise the EC2 pull will fail. The server needs Docker and either Docker Compose v2 (`docker compose`) or the legacy `docker-compose` binary.

## Server setup

Before the first deployment, create `/opt/money-track` and make the deployment user its owner. The workflow then checks out `main` there. The server user needs Docker access, Git, and outbound HTTPS access to GitHub Container Registry, Telegram, and the public domain.

```bash
sudo mkdir -p /opt/money-track
sudo chown "$USER":"$USER" /opt/money-track
```

Cloudflare should proxy the domain and use **Full (strict)** SSL with the configured Origin Certificate. Open only ports 80 and 443 publicly; restrict SSH to trusted addresses.

`/opt/money-track/.env.prod` and its rollback snapshot are generated by the workflow and intentionally ignored by Git. Use [.env.prod.example](../.env.prod.example) only as a non-secret local reference. If a real credential was ever placed in the previously tracked `.env.prod`, rotate it.

## Manual frontend rollback

Use this only if the automated rollback itself cannot complete. It preserves the database and backend containers, then recreates the frontend and Nginx.

```bash
cd /opt/money-track
umask 077
rollback_image="$(sed -n 's/^ROLLBACK_FRONTEND_IMAGE=//p' .env.prod.previous | tail -n 1)"
test -n "$rollback_image"
awk -v image="$rollback_image" '
  /^FRONTEND_IMAGE=/ { print "FRONTEND_IMAGE=" image; updated=1; next }
  { print }
  END { if (!updated) print "FRONTEND_IMAGE=" image }
' .env.prod > .env.prod.rollback
mv .env.prod.rollback .env.prod
chmod 600 .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod pull frontend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate frontend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate nginx
```

If the host only has the legacy binary, replace `docker compose` with `docker-compose` in those commands.

## Operational checks

```bash
cd /opt/money-track
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 frontend backend nginx
curl --resolve money-track.org:443:127.0.0.1 --insecure https://money-track.org/version.json
curl --resolve money-track.org:443:127.0.0.1 --insecure https://money-track.org/health
```

The `version.json` response must contain the full commit SHA recorded in the successful Actions run.

## Deployment preflight and recovery

Before changing production Compose or Nginx configuration, validate that Compose can render without secrets, then inspect the rendered Nginx mount.

```bash
POSTGRES_PASSWORD=verification \
TELEGRAM_BOT_TOKEN=verification \
docker compose -f docker-compose.prod.yml config -q

POSTGRES_PASSWORD=verification \
TELEGRAM_BOT_TOKEN=verification \
docker compose -f docker-compose.prod.yml config | grep -F 'target: /etc/nginx/conf.d/default.conf'
```

If a manual frontend or backend container recreation produces `502` responses, recreate Nginx after the upstream services:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate nginx
```

If Nginx instead exits with `host not found in upstream "host.docker.internal"`, production is loading a local-only Nginx configuration. Restore the checked-in production Compose configuration and confirm the preflight succeeds before restarting Nginx.
