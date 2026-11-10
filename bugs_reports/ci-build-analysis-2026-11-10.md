# CI build latency findings — 2026-11-10

Scope: review of supplied external CI/CD analysis; no pipeline changes requested.

## Evidence

- `ci-build-analysis-2026-11-10-source.txt`: original external-agent report supplied by user; its estimates are unverified claims.
- https://github.com/Alex69rus/money-track/actions/runs/40638573039: completed production run, 2026-10-28.
- https://github.com/Alex69rus/money-track/actions/runs/40543011239: completed production run, 2026-10-27.
- https://github.com/Alex69rus/money-track/actions/runs/42854455888: in progress at inspection (2026-11-10 16:30 UTC); do not infer final duration.
- Local workflow and Dockerfiles inspected at commit `178072d`.

## BR-029 — Production frontend rebuilds JS dependencies and assets under ARM64 emulation

Priority: P2

### Actual

Production targets linux/arm64 on ubuntu-latest. Frontend build stage uses the target platform. On October 28, Docker npm ci took 72.8 seconds and npm run build took 141.1 seconds. The build-and-push step took 228 seconds; the complete job took 248 seconds. Native validation npm build took 8 seconds. On October 27 the production build-and-push step took 137 seconds. The supplied 15–25 minute estimate is not established by these runs.

The frontend intermediate build stage is not exported by mode=min. Backend is single-stage: mode=min includes its dependency layers, so mode=max alone does not address a demonstrated backend cache exclusion.

The validation Docker build has no platforms setting and runs natively: 22 seconds on October 28, 27 seconds on October 27, 53 seconds on November 10. Its alleged QEMU cost of 10–15 minutes is contradicted by configuration and observed durations.

Frontend quality commands are duplicated between deploy.yml and frontend-new-ci.yml on matching events. Their parallel execution duplicates runner usage, rather than necessarily doubling elapsed feedback time. The production runtime image already excludes Node tooling.

### Expected

Avoid unnecessary emulated frontend compilation and repeated quality work while preserving production image validation and revision identity.

### Reproduction

1. Inspect deploy.yml build-and-push platform and frontend Dockerfile build stage.
2. Open the linked completed runs and frontend build logs.
3. Compare native validation and ARM64 Docker build timings.

### Acceptance criteria

- Measure native versus target-platform build durations on comparable commits before claiming an improvement.
- Preserve ARM64 deployment, required checks, same-origin API configuration, and version.json commit identity.
- Distinguish cold/warm caches and runner time from total elapsed deployment time.
- If a host-built dist is introduced, account for existing .dockerignore exclusion of dist.
