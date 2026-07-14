# Production deployment Telegram menu validation failure — 2026-07-14

Scope: production deployment of PR #13 / merged commit `487d2c070213c183453467c14f7827b21336ad68`.

This is raw evidence for one focused deployment fix. It intentionally has no
`docs/tasklist.md` entry under the repository rule for isolated CI and
deployment defects.

## Evidence

Source: user-supplied deployment log from the `Deploy to Production / deploy`
job on 2026-07-14.

Relevant observed output:

```text
curl: (22) The requested URL returned error: 502
curl: (22) The requested URL returned error: 502
curl: (22) The requested URL returned error: 502
ERROR: Telegram menu button URL does not match the production frontend
Process exited with status 1
```

The three `502` responses occurred during the workflow's retrying frontend
readiness probe. The script advanced past frontend revision/route verification
and backend health verification, so those probes subsequently succeeded.

## Actual

The server pulled the new immutable frontend image, recreated the frontend and
backend, and passed its frontend revision, SPA route, container-image, and
backend health checks. The deployment job then failed at its final check of
Telegram's default chat menu button.

The workflow calls `getChatMenuButton` and compares its raw JSON to an exact
`"url":"https://${DOMAIN}"` string. It does not log the non-secret returned
menu-button type/URL when the check fails. The supplied log therefore proves a
mismatch but does not reveal the returned value.

Follow-up inspection on the production host retrieved the default menu button
from the running backend container:

```json
{"ok": true, "result": {"type": "web_app", "text": "App", "web_app": {"url": "https://money-track.org/"}}}
```

Telegram accepted the backend's `setChatMenuButton` call for
`https://money-track.org`, then returned the equivalent root URL with a trailing
slash. The deployment's literal comparison therefore rejects a correct menu
button.

The backend is the intended owner of registration: its FastAPI lifespan awaits
`TelegramBotRuntime.start()`, which awaits `set_chat_menu_button` with
`TELEGRAM_WEB_APP_URL`. A healthy `/health` response therefore proves that the
registration call completed without raising. The deployment script must not
duplicate that ownership.

The focused backend test has a coverage defect: its fake bot lacks
`set_chat_menu_button`, so it fails before it can assert the default Web App
menu-button URL.

## Expected

A deployment that has made the production frontend and backend healthy must
configure and verify the Telegram Web App URL in Telegram's canonical root
form (`https://${DOMAIN}/`). The browser CORS origin remains
`https://${DOMAIN}` because an origin has no trailing slash.

## Reproduction

1. Merge a change to `main` so the production workflow recreates the backend
   and frontend with `TELEGRAM_WEB_APP_URL=https://${DOMAIN}`.
2. Allow the application-facing readiness probes to succeed.
3. Observe the deployment fail if Telegram reports a menu button whose raw
   response does not exactly match the workflow's string comparison.

## Acceptance criteria

- Backend unit coverage proves that `TelegramBotRuntime.start()` registers the
  default `web_app` menu button with `TELEGRAM_WEB_APP_URL`.
- Deployment passes `https://${DOMAIN}/` as `TELEGRAM_WEB_APP_URL` and
  verifies that exact canonical URL; it continues to reject any other URL or
  menu-button type.
- `CORS_ALLOW_ORIGINS` remains the canonical browser origin
  `https://${DOMAIN}`.
- The existing frontend revision, route, backend-health, and frontend-only
  rollback behavior remain unchanged.
