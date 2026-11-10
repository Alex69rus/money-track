# BR-029 — Native frontend container build

State: Fixed — verification pending (GitHub Actions timing and remote cache behavior).

Source: [CI latency report](ci-build-analysis-2026-11-10.md).

## Changes

- Build frontend assets on `$BUILDPLATFORM` using the existing Dockerfile. Keep nginx on the target platform and preserve same-origin API configuration, revision identity, and healthcheck.
- Export frontend intermediate layers with `mode=max`; keep backend on `mode=min` and retain existing service-specific cache scopes.
- Remove duplicate `frontend-new-ci.yml`. Keep frontend lint, typecheck, tests, build, and production Docker verification in `deploy.yml` for PRs targeting main and pushes to main. The removed workflow also covered PRs targeting other branches; those no longer receive its standalone frontend check.
- GitHub API preflight: main branch protection returned `404 Branch not protected`; applicable branch rules returned `[]`. No required status check migration was indicated at inspection.
- Document the build/cache policy in deployment documentation and frontend guardrails.

## Verification — 2026-11-10

- From `frontend_new`: `npm run lint && npm run typecheck && npm run test:run && npm run build` — passed; 22 test files, 83 tests.
- `actionlint v1.7.7 -shellcheck= -pyflakes= .github/workflows/deploy.yml .github/workflows/claude.yml` — passed. Run through `go run` with temporary module/build caches. Optional shellcheck/pyflakes integrations were disabled; workflow and expression validation remained enabled.
- Both workflow YAML files parsed successfully using installed `js-yaml`.
- `docker buildx build --platform linux/amd64 --build-arg VITE_API_BASE_URL= --build-arg BUILD_SHA=178072d28d080e8643760f989cfae9e09f5cfdaf --tag money-track-frontend-ci-review:amd64 --load --progress plain ./frontend_new` — passed on local linux/aarch64 Docker. Native build steps: npm ci 34.7 seconds; npm run build 7.2 seconds. These are local observations, not GitHub speedup measurements.
- Repeated the build for `linux/arm64` with the same arguments and tag suffix `arm64` — passed; native npm/build layers reused across target architectures. Image inspection confirmed amd64 and arm64 runtime architectures respectively.
- Started the ARM64 image with `--network none`, no published ports; polled readiness and checked exact revision JSON, `/transactions` equality with `/index.html`, observed `Cache-Control: no-store`, validated `nginx -t`, and checked the image healthcheck still targets version.json. All passed; test container removed.
- `git diff --check` — passed.

## Remaining verification

No push or production deployment performed. Confirm the next GitHub Actions run builds successfully on x86, then compare cold and warm frontend build durations and intermediate cache hits. Remote GHA cache export/import and wall-clock savings cannot be proven by local Docker cache reuse.

Phase/device QA was not run: this slice changes CI and container assembly, with no frontend application, API, layout, navigation, or Telegram behavior changes. Local Docker smoke checks cover the affected serving contract.
