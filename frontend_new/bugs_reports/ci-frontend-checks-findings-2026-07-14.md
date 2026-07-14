# Frontend pull-request CI findings — 2026-07-14

Scope: pull request #13 (`feature/fe-redesign` into `main`), GitHub Actions frontend validation before production deployment.

This report records the observed CI defect only. The failing job logs determine the implementation scope.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `ci-frontend-checks-failing-2026-07-14.png` | PR #13 checks | `validate-frontend` and `Frontend New CI / quality` fail, while backend validation and intentional pull-request deploy skips behave as expected. |

## BR-009 — Frontend validation blocks redesign pull request

Priority: P1

Evidence: `ci-frontend-checks-failing-2026-07-14.png`; user-supplied PR #13 check summary.

### Actual

The two independent GitHub Actions jobs that validate `frontend_new` fail before the image build and deployment gates can run. The backend validation and pull-request-only skip behavior succeed.

Both job logs identify the same failing command: `npm run lint`. After `npm ci` under Node `v20.20.2`, ESLint reports 124 `@typescript-eslint/no-unsafe-assignment` and `@typescript-eslint/no-unsafe-call` errors across frontend source and shadcn primitives.

### Expected

Both frontend validation jobs pass for the current redesign branch so a merge to `main` can proceed to the protected production build and deploy jobs.

### Reproduction

1. Open pull request #13 from `feature/fe-redesign` to `main`.
2. Wait for the `Deploy to Production / validate-frontend` and `Frontend New CI / quality` checks.
3. Observe both checks fail.

### Acceptance criteria

- The shared frontend failure is identified from the GitHub Actions job logs, not inferred from the check summary.
- `validate-frontend` and `Frontend New CI / quality` both pass for PR #13.
- Build-and-push and deploy remain skipped for pull-request events and run only after a merge to `main`.
