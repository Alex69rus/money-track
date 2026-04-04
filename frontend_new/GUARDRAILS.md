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

When a guardrail is promoted into `frontend_new/AGENTS.MD`, avoid duplicating the full rule text here. Keep only iteration-specific context and note the protocol reference.

## 2026-04-04 - Iteration Phase 1 (Transactions List + Filters)

- Scope: Implement FR-006, FR-007, FR-008, FR-009, FR-017, FR-032, FR-034, FR-036, FR-037 in `frontend_new` with typed API adapters, debounced filters, and incremental loading.
- What went wrong: `npx shadcn@latest add ...` wrote generated files into `frontend_new/@/components/ui` instead of `frontend_new/src/components/ui`.
- Root cause: CLI path resolution did not align with this repo layout when aliases were declared as `@/...` values in `components.json` while TS path metadata lives in `tsconfig.app.json`.
- Validated pattern to repeat: Keep filter form state as string-based draft, debounce request projection, and isolate list/options fetches behind independent `AbortController` lifecycles with explicit retry actions.
- Exploration notes: Verified backend route/schema contracts (`/api/transactions`, `/api/categories`, `/api/tags`) directly from `backend_new/app/api/routes/*` and `backend_new/app/schemas/responses.py`; ruled out reusing legacy frontend DTO/environment assumptions as a source of truth.
- Codified in AGENTS: Protocol A (shadcn generation safety) and Protocol B (API contract verification).
- Files/areas affected: `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/src/features/transactions/**`, `frontend_new/src/services/api/**`, `frontend_new/src/components/ui/**`, `frontend_new/src/styles.css`, `frontend_new/components.json`.

## 2026-04-04 - Iteration Phase 1 QA Stabilization (Sub-agent + MCP)

- Scope: Stabilize end-of-phase QA execution when browser MCP sessions and sub-agent runs are flaky.
- What went wrong: QA sub-agent runs repeatedly timed out or returned incomplete (`PARTIAL`) FR coverage due to browser session lock/transport instability and unstable forced-failure probes.
- Root cause: Shared browser profile contention plus non-deterministic interception/reload patterns produced aborted requests (`ERR_ABORTED`) instead of stable failure states.
- Validated pattern to repeat: Split verification into two passes (normal flow and deterministic failure-path flow), and require final `PASS`/`FAIL` per FR with no `PARTIAL` output.
- Exploration notes: Tested forced `500` interception/reload and ruled it out as primary failure-path evidence because aborted-request churn masked settled UI behavior.
- Codified in AGENTS: Protocol C (QA runtime ownership/stability) and Protocol D (phase-exit evidence standard).
- Files/areas affected: `frontend_new/AGENTS.MD`, `frontend_new/GUARDRAILS.md`.

## 2026-04-04 - Iteration Phase 2 (Transaction Edit Surfaces)

- Scope: Implement FR-010..FR-016 and FR-035 with dedicated category/tag selector dialogs, full edit dialog, delete confirmation, and in-place list updates.
- What went wrong: `npx shadcn@latest add alert-dialog` repeatedly prompted for overwriting existing `button.tsx`, preventing non-interactive component generation.
- Root cause: Registry component dependency prompts can block scripted runs when base components already exist and overwrite policy is not explicitly controlled.
- Validated pattern to repeat: Keep list updates local by exposing `replaceTransaction` / `removeTransaction` hook mutations, then reuse a single API update payload builder for quick-edit and full-edit surfaces.
- Exploration notes: Verified backend update contract requires full transaction payload on `PUT /api/transactions/{id}` and ruled out partial-patch requests for quick category/tag actions.
- Prevention rule: For selector and edit flows, keep two-layer confirmation: local draft in dialog first, then explicit `Update` / `Save` action before sending API requests.
- Codified in AGENTS: Protocol A (shadcn generation safety).
- Files/areas affected: `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/src/features/transactions/components/**`, `frontend_new/src/features/transactions/hooks/useTransactionsList.ts`, `frontend_new/src/services/api/transactions.ts`, `frontend_new/src/components/ui/**`, `docs/tasklist.md`.

## 2026-04-04 - Iteration Phase 2 QA Recovery (MCP + Runtime Orchestration)

- Scope: Execute end-of-phase FR verification for Phase 2 under repeated MCP session failures, backend restarts, and CORS/runtime drift.
- What went wrong: QA runs failed repeatedly due to Chrome MCP profile lock / transport closure, mixed sandbox vs escalated network visibility, and backend startup variance (`test-token` / webhook behavior).
- Root cause: No single canonical QA bootstrap path existed; multiple agents attempted to self-manage FE/BE state and browser ownership concurrently.
- Validated pattern to repeat: Before browser QA, run a deterministic readiness gate from the same network context used by QA (`curl /health`, `curl FE root`) and only then execute FR checks.
- Exploration notes: Confirmed MCP lock failures are environment/session issues (not product regressions); ruled out treating `ERR_ABORTED` request cancellations during UI transitions as functional failures when FR outcomes are otherwise validated.
- Codified in AGENTS: Protocol C (QA runtime ownership/stability).
- Files/areas affected: `frontend_new/GUARDRAILS.md`, QA execution flow in thread-level process.

## 2026-04-04 - Iteration QA Automation (Reusable Phase Runner)

- Scope: Replace ad-hoc phase testing with a reusable phase runner and runtime bootstrap flow (`qa:phase` + phase module architecture).
- What went wrong: Manual QA orchestration mixed service startup, browser control, and FR assertions in one-off commands, causing repeated drift and hard-to-reproduce failures.
- Root cause: Missing canonical QA entrypoint and missing stable selectors for phase-critical interactions.
- Validated pattern to repeat: Use deterministic `data-testid` hooks for FR-critical controls and keep runtime orchestration in one shell wrapper that reuses healthy FE/BE services.
- Exploration notes: Verified the generic runner succeeds with reused services and explicit FR matrix output; ruled out MCP dependency as a hard gate for local phase-exit verification.
- Codified in AGENTS: Protocol E (canonical QA execution path).
- Files/areas affected: `scripts/run_frontend_phase_qa.sh`, `frontend_new/scripts/qa/**`, `frontend_new/package.json`, `package.json`, `frontend_new/src/features/transactions/components/**`, `frontend_new/README.md`, `frontend_new/docs/qa-acceptance-checklist.md`.

## 2026-04-04 - Iteration Phase 3 QA Scaffold (Analytics TODO Matrix)

- Scope: Scaffold `phase3` QA module so analytics FR onboarding is assertion-fill only, not tooling rebuild.
- What went wrong: New phase onboarding still required hand-wiring imports/scripts/docs each time.
- Root cause: No dedicated placeholder phase module existed for analytics FRs.
- Guardrail to apply next time: Start each new phase by cloning the scaffold pattern (`frIds` + TODO matrix + artifacts), then replace TODOs incrementally with deterministic Playwright assertions.
- Validated pattern to repeat: Keep FR IDs and TODO hints explicit in the phase module so failure output doubles as implementation checklist.
- Exploration notes: Confirmed existing runner already supports phase plug-ins via `PHASES` map; ruled out any need for runtime bootstrap script changes.
- Prevention rule: Do not begin a new phase with ad-hoc checks; add/wire phase module and npm shortcut first, then fill FR assertions.
- Files/areas affected: `frontend_new/scripts/qa/phases/phase3.mjs`, `frontend_new/scripts/qa/phases/scaffold-utils.mjs`, `frontend_new/scripts/qa/run-phase.mjs`, `frontend_new/package.json`, `package.json`, `frontend_new/README.md`, `frontend_new/docs/qa-acceptance-checklist.md`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.
