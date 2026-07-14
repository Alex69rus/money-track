# Docker frontend runtime findings — 2026-07-14

Scope: Local production-image smoke test for `frontend_new` after the redesign deployment cutover.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `docker-frontend-runtime-smoke-2026-07-14.png` | Local `money-track-frontend-new:local-verify` container | Docker built and tagged the image, but requests to the published Nginx port returned `curl: (52) Empty reply from server`. |
| `docker-frontend-runtime-smoke-passed-2026-07-14.png` | Re-run of the same local image | `/version.json` returned `{"revision":"local-verify"}` and `/transactions` returned HTTP 200 after Nginx was ready. |

## BR-008 — Production frontend image closes local HTTP requests

Priority: P1

Evidence: `docker-frontend-runtime-smoke-2026-07-14.png`; user-run local smoke-test output.

### Initial observation

The frontend image exports successfully. Starting it on `127.0.0.1:18080` returns a container ID, but requests issued immediately afterwards returned an empty HTTP reply.

### Triage outcome

This is not a frontend-image defect. A re-run that allowed Nginx to finish startup returned `{"revision":"local-verify"}` from `/version.json` and HTTP 200 for `/transactions`. `--rm` removes a container only after it stops; the initial commands raced normal Nginx startup.

### Reproduction

1. Build `frontend_new` with `BUILD_SHA=local-verify`.
2. Start `money-track-frontend-new:local-verify` with `-p 127.0.0.1:18080:80`.
3. Request `/version.json` and `/transactions` with `curl` without a readiness wait.
4. Observe `curl: (52) Empty reply from server`, then retry after startup completes and observe the expected responses.

### Verification

- `curl http://127.0.0.1:18080/version.json` returned the supplied build revision.
- `curl -I http://127.0.0.1:18080/transactions` returned HTTP 200.
- The production deploy script already waits for `/version.json`, so it does not have this race.
