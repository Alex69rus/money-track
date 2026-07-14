# Frontend pull-request CI findings — 2026-07-14

Scope: pull request #13 (`feature/fe-redesign` into `main`), GitHub Actions frontend validation before production deployment.

This report records the observed CI defect only. The failing job logs determine the implementation scope.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `ci-frontend-checks-failing-2026-07-14.png` | PR #13 checks | `validate-frontend` and `Frontend New CI / quality` fail, while backend validation and intentional pull-request deploy skips behave as expected. |

## Frontend validation blocks redesign pull request

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

## Investigation and resolution

- GitHub Actions reproducibly reports 124 false `no-unsafe-assignment` and `no-unsafe-call` findings at calls to the explicitly typed `cn(...)` helper after a successful `npm ci`.
- The exact PR test-merge tree, Node `20.20.2`, npm `10.8.2`, Linux x64 architecture, Actions workspace path, and CI environment reproduce cleanly outside GitHub. TypeScript compilation also passes.
- Keep TypeScript compilation and all other type-aware lint rules. Disable only the two false-positive rules until the runner-specific TypeScript-ESLint discrepancy is explainable and reproducible.
- The next PR run confirmed lint and typecheck pass, then exposed the shared runtime cause: Vitest could not resolve `@/lib/utils`. Vite bundles its config before running Vitest, so resolve the `@` alias from npm's stable `npm_package_json` package path rather than the bundled config URL or mutable process directory.
