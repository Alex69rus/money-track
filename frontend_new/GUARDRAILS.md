# Frontend New Guardrails

This file stores short post-iteration retrospectives for `frontend_new`.

Rule:
- After every completed iteration, the agent must call `iteration-retrospective-capture`.
- The distilled result must be appended here.

Entry template:

## YYYY-MM-DD - Iteration <id or scope>

- Scope:
- What went wrong:
- Root cause:
- Guardrail to apply next time:
- Validated pattern to repeat:
- Files/areas affected:

## 2026-04-04 - Iteration Phase 1 (Transactions List + Filters)

- Scope: Implement FR-006, FR-007, FR-008, FR-009, FR-017, FR-032, FR-034, FR-036, FR-037 in `frontend_new` with typed API adapters, debounced filters, and incremental loading.
- What went wrong: `npx shadcn@latest add ...` wrote generated files into `frontend_new/@/components/ui` instead of `frontend_new/src/components/ui`.
- Root cause: CLI path resolution did not align with this repo layout when aliases were declared as `@/...` values in `components.json` while TS path metadata lives in `tsconfig.app.json`.
- Guardrail to apply next time: Immediately verify generated paths after every shadcn add command and keep `components.json` aliases mapped to concrete `src/*` paths in this repo.
- Validated pattern to repeat: Keep filter form state as string-based draft, debounce request projection, and isolate list/options fetches behind independent `AbortController` lifecycles with explicit retry actions.
- Exploration notes: Verified backend route/schema contracts (`/api/transactions`, `/api/categories`, `/api/tags`) directly from `backend_new/app/api/routes/*` and `backend_new/app/schemas/responses.py`; ruled out reusing legacy frontend DTO/environment assumptions as a source of truth.
- Files/areas affected: `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/src/features/transactions/**`, `frontend_new/src/services/api/**`, `frontend_new/src/components/ui/**`, `frontend_new/src/styles.css`, `frontend_new/components.json`.

## 2026-04-04 - Iteration Phase 1 QA Stabilization (Sub-agent + MCP)

- Scope: Stabilize end-of-phase QA execution when browser MCP sessions and sub-agent runs are flaky.
- What went wrong: QA sub-agent runs repeatedly timed out or returned incomplete (`PARTIAL`) FR coverage due to browser session lock/transport instability and unstable forced-failure probes.
- Root cause: Shared browser profile contention plus non-deterministic interception/reload patterns produced aborted requests (`ERR_ABORTED`) instead of stable failure states.
- Guardrail to apply next time: Require fixed QA port + isolated browser profile; if one run stalls, interrupt once then respawn; use deterministic failure probes (unreachable `VITE_API_BASE_URL`) for error/retry FRs.
- Validated pattern to repeat: Split verification into two passes (normal flow and deterministic failure-path flow), and require final `PASS`/`FAIL` per FR with no `PARTIAL` output.
- Exploration notes: Tested forced `500` interception/reload and ruled it out as primary failure-path evidence because aborted-request churn masked settled UI behavior.
- Prevention rule: Do not close a phase QA gate until a single final report contains explicit `PASS`/`FAIL` for every mapped FR with reproducible runtime evidence.
- Files/areas affected: `frontend_new/AGENTS.MD`, `frontend_new/GUARDRAILS.md`.
