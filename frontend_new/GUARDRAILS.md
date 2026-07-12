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

## 2026-04-05 - Iteration Phase 3 (Analytics + Drilldown)

- Scope: Implement FR-018..FR-022 with analytics date-range controls, summary/category/tag/trend widgets, and category drilldown popup in `frontend_new`.
- What went wrong: Initial FR-020 QA evidence was flaky because loading-state detection relied on first page load timing and occasionally missed the transient loader.
- Root cause: Loading assertion timing was coupled to startup race conditions instead of a deterministic forced-latency request.
- Guardrail to apply next time: For loading-state QA, inject one delayed network request on demand and assert loader visibility during that known delay window.
- Validated pattern to repeat: Keep analytics derived from one normalized dataset (`buildAnalyticsModel`) so summary, category, tag, and trends always recompute together on range changes.
- Exploration notes: Verified drilldown context preservation by comparing date-filter values before/after close and ruled out route-based drilldown because modal state keeps analytics context simpler and more robust.
- Prevention rule: Add explicit `data-testid` hooks for each FR-critical widget before writing phase QA so assertion coverage does not depend on fragile text selectors.
- Files/areas affected: `frontend_new/src/pages/AnalyticsPage.tsx`, `frontend_new/src/features/analytics/**`, `frontend_new/src/services/api/analytics.ts`, `frontend_new/scripts/qa/phases/phase3.mjs`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-04-05 - Iteration Phase 4 (AI Chat)

- Scope: Implement FR-023..FR-027 in `frontend_new` with `/api/chat` adapter wiring, timeline UI, keyboard/send behavior, pending state, reset confirmation, and failure fallback handling.
- What went wrong: Browser-based phase QA could not complete reliably in this environment because Playwright-launched Chromium headless processes hung/aborted.
- Root cause: Local runtime constraints around headless browser launch/process lifecycle (`SIGABRT`/stalled Chromium shell) prevented deterministic Playwright execution.
- Guardrail to apply next time: Before phase-exit QA, run a minimal Playwright smoke command to validate browser launch health; if blocked, immediately switch to component-level deterministic tests and document browser-runtime blocker explicitly.
- Validated pattern to repeat: Keep chat request handling resilient by rendering a pending assistant bubble first, then replacing it in-place with either API response or fallback text while preserving message order.
- Exploration notes: Verified `/api/chat` is not currently implemented in `backend_new`, so FE must tolerate 404/5xx gracefully; ruled out hard-failing UI on chat request errors.
- Prevention rule: Add FR-critical `data-testid` hooks during implementation so QA can assert behavior with either Playwright or RTL tests without selector churn.
- Files/areas affected: `frontend_new/src/pages/AiChatPage.tsx`, `frontend_new/src/services/api/chat.ts`, `frontend_new/src/pages/AiChatPage.test.tsx`, `frontend_new/scripts/qa/phases/phase4.mjs`, `frontend_new/scripts/qa/run-phase.mjs`, `frontend_new/src/components/ui/button.tsx`, `frontend_new/src/test/setup.ts`, `frontend_new/GUARDRAILS.md`.

## 2026-04-05 - Iteration Browser QA Triage (Chrome MCP + Playwright)

- Scope: Investigate recurring browser QA failures and codify deterministic MCP/Playwright recovery steps for redesign phases.
- What went wrong: QA failures mixed multiple root causes (`listen EPERM` frontend bind, backend startup permission failure, Chrome channel `SIGABRT`/`kill EPERM`, and missing Playwright browser binaries), causing non-deterministic recovery attempts.
- Root cause: Browser QA preflight did not enforce strict readiness + single-owner runtime orchestration before launching MCP/Playwright sessions.
- Guardrail to apply next time: Run runtime readiness checks first (`curl` FE root and backend `/health`) and classify failures as runtime/bootstrap vs browser engine before retrying tests.
- Validated pattern to repeat: Keep one canonical fallback order: readiness gate -> browser binary check -> Chrome-to-Chromium fallback -> deterministic component tests with blocker evidence.
- Exploration notes: Confirmed logs captured distinct failure signatures and ruled out product-regression attribution when runtime services/browser process lifecycle were failing first.
- Prevention rule: Never continue FR browser assertions while FE/BE readiness checks fail; fix readiness first, then run MCP/Playwright.
- Files/areas affected: `frontend_new/AGENTS.MD`, `frontend_new/README.md`, `frontend_new/GUARDRAILS.md`.

## 2026-04-05 - Iteration Phase 5 (Integration Hardening)

- Scope: Implement FR-028, FR-030, FR-031, FR-033, FR-040 with adapter-level fallback mode, Telegram viewport hardening, and Phase-5 QA coverage.
- What went wrong: Existing resilience handled failure states but did not provide deterministic fallback data mode for dev/test outage scenarios.
- Root cause: API adapters surfaced network errors directly without an explicit read-only fallback layer and without shell-level fallback visibility.
- Guardrail to apply next time: Keep fallback behavior adapter-local and network-error-specific (`status=0`) so forced 4xx/5xx QA checks remain truthful.
- Validated pattern to repeat: Use a shared fallback-state store plus shell banner so all surfaces (transactions/analytics/filters) clearly indicate fallback mode activation.
- Exploration notes: Verified Telegram-safe reachability improves when shell min-height tracks `viewportStableHeight`; ruled out silent production fallback behavior to prevent hidden data drift.
- Prevention rule: Fallback data is allowed only in dev/test and only for read paths; never silently fallback writes.
- Files/areas affected: `frontend_new/src/services/api/**`, `frontend_new/src/app/layout/AppShell.tsx`, `frontend_new/src/services/telegram/webapp.ts`, `frontend_new/scripts/qa/phases/phase5.mjs`, `frontend_new/docs/**`, `docs/tasklist.md`.

## 2026-05-07 - Iteration Phase 5 QA Runtime Fix

- Scope: Restore deterministic Phase-5 QA startup flow after backend bootstrap failed before `/health`.
- What went wrong: `qa:phase5` failed with backend readiness timeout even though dependencies were installed.
- Root cause: QA script invoked `uv run uvicorn app.main:app`, but `uvicorn` executable was not resolvable in this environment.
- Guardrail to apply next time: In QA bootstrap scripts, start backend using module invocation (`uv run python -m uvicorn app.main:app`) to avoid PATH/executable lookup drift.
- Validated pattern to repeat: Keep backend/frontend lifecycle ownership inside one script and verify phase matrix only after readiness checks pass.
- Exploration notes: Confirmed failure came from process spawn (`No such file or directory: uvicorn`), not backend API regressions; ruled out FE regression because Phase-5 FR matrix passed immediately after command fix.
- Prevention rule: Treat readiness timeouts as runtime-bootstrap defects first; inspect startup logs before changing feature code.
- Files/areas affected: `scripts/run_frontend_phase_qa.sh`, `frontend_new/README.md`, `frontend_new/AGENTS.MD`, `frontend_new/GUARDRAILS.md`.

## 2026-05-26 - Iteration VF-0 (Visual Audit + Baseline Capture)

- Scope: Complete `VF-0` by producing draft-vs-current visual inventory, token extraction, and baseline phone screenshots at `390x844` / `DPR 3`.
- What went wrong: Local screenshot capture initially failed twice (`vite` bind `EPERM` in sandbox and Playwright Chromium launch permission failure).
- Root cause: Browser QA/capture operations required escalated runtime permissions for local port binding and headless browser process control in this environment.
- Guardrail to apply next time: When visual audit needs browser capture, run with a single escalated runtime owner early and capture all target surfaces in one deterministic Playwright script.
- Validated pattern to repeat: Use backend-unreachable fallback mode for deterministic visual baseline captures when the task is fidelity-only and behavior must remain unchanged.
- Exploration notes: Verified default analytics date preset can produce empty states with fallback seed data; ruled out relying on default month during screenshot automation and forced a deterministic date range in the capture script.
- Prevention rule: Before writing VF gap conclusions, ensure every draft-mapped surface has an actual captured artifact at the target viewport (including dialogs/popups), not only route-level screenshots.
- Files/areas affected: `frontend_new/docs/vf-0-visual-audit.md`, `frontend_new/docs/visual-audit/vf-0-current/*.png`, `frontend_new/.codex-tmp/vf0_capture.mjs`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-05-26 - Iteration VF-1 (App Shell + Transactions Home Alignment)

- Scope: Align `AppShell` and transactions home surface to the `home_screen_with_transactions_nav` draft while preserving Phase 1/2 behaviors.
- What went wrong: A mid-iteration patch left duplicated stale JSX in `TransactionsMobileList.tsx`, breaking the file structure.
- Root cause: Partial patch replacement was applied over a large component without revalidating full-file integrity immediately.
- Guardrail to apply next time: After any large visual refactor patch, re-open the entire edited file before running quality gates to catch duplicate/stray blocks early.
- Validated pattern to repeat: Keep visual refactor behavior-safe by retaining existing callbacks/test hooks and only changing composition/styling layers first.
- Exploration notes: Verified backend already returns `category.icon` in FE types/mappers and ruled out any BE contract change for VF-1 icon rendering.
- Prevention rule: For visual parity work, add deterministic post-change phone screenshots (`390x844`/`DPR 3`) and run mapped phase QA before considering a VF slice complete.
- Files/areas affected: `frontend_new/src/app/layout/AppShell.tsx`, `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/src/features/transactions/components/TransactionsFiltersCard.tsx`, `frontend_new/src/features/transactions/components/TransactionsMobileList.tsx`, `frontend_new/src/styles.css`, `frontend_new/index.html`, `frontend_new/docs/visual-audit/vf-1-after/transactions-home-vf1.png`, `docs/tasklist.md`.

## 2026-05-26 - Iteration VF-2 (Transaction Detail Popup Alignment)

- Scope: Align `TransactionEditDialog` to the `transaction_detail_pop_up` draft while preserving Phase-2 edit/save/delete/category/tag flows.
- What went wrong: First QA rerun failed with all FR checks red because `VITE_API_BASE_URL` was missing, and then a ref warning appeared after moving the date picker to a hidden field.
- Root cause: Phase QA runner inherits the current shell env (no implicit API base), and `Input` is not `forwardRef`, so ref-based picker wiring on `Input` produced React warnings.
- Guardrail to apply next time: For phase QA commands from repo root, always export `VITE_API_BASE_URL` explicitly; when a hidden control needs a ref, prefer native inputs unless the UI primitive forwards refs.
- Validated pattern to repeat: Keep VF-only changes behavior-safe by preserving all FR test IDs and action handlers, then iterating strictly on composition and token-level styling.
- Exploration notes: Verified backend-provided category icon names can be reused directly inside popup surfaces via Material Symbols rendering and ruled out frontend-only icon mapping.
- Prevention rule: Treat QA `console_errors` as release blockers for VF phases even when FR matrix is all-pass, then rerun the phase after fixing warnings.
- Files/areas affected: `frontend_new/src/features/transactions/components/TransactionEditDialog.tsx`, `frontend_new/docs/visual-audit/vf-2-after/transaction-edit-dialog-vf2.png`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-05-26 - Iteration VF-3 (Category Selector Alignment)

- Scope: Align `TransactionCategorySelectorDialog` to the `category_selector_expandable_groups` draft while preserving FR-010/FR-011/FR-016 behavior.
- What went wrong: Phase-2 QA initially failed because `tx-category-update` became unclickable (`element is outside of the viewport`) after sheet geometry and typography changes.
- Root cause: Bottom-sheet sizing/positioning and overly large list typography allowed content to consume the viewport budget, pushing the explicit confirm action beyond QA-clickable bounds.
- Guardrail to apply next time: For visual sheet refactors, lock the action area with constrained `max-h` + `overflow-hidden` on the sheet and verify primary action clickability in QA before polishing typography.
- Validated pattern to repeat: Keep behavior by context using one selector component (`instantApply` for full edit, explicit confirm for quick edit) while limiting VF work to structure/tokens/icons.
- Exploration notes: Tested fixed-height sheet geometry and ruled it out because default dialog breakpoint transforms and content density made action controls inaccessible in QA.
- Prevention rule: After any dialog/list visual density change, rerun phase QA immediately and treat “outside viewport” click errors as layout regressions, not test flakiness.
- Files/areas affected: `frontend_new/src/features/transactions/components/TransactionCategorySelectorDialog.tsx`, `frontend_new/src/features/transactions/components/TransactionEditDialog.tsx`, `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/docs/visual-audit/vf-3-after/category-selector-dialog-vf3.png`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-05-26 - Iteration VF-4 (Tag Selector Alignment)

- Scope: Align `TransactionTagSelectorDialog` to `tag_selector_chip_grid_layout` while preserving FR-012 explicit confirmation and Phase-2 update-in-place behavior.
- What went wrong: Early QA reruns failed with all FR checks red either from browser runtime permissions or from frontend requests accidentally targeting `:4173/api/*`.
- Root cause: QA command context drift (`VITE_API_BASE_URL` missing in frontend runtime) plus sandbox-restricted browser launch during combined runtime checks.
- Guardrail to apply next time: Run Phase QA with a single escalated runtime owner and always start frontend with explicit `VITE_API_BASE_URL=http://127.0.0.1:8000` before asserting FR outcomes.
- Validated pattern to repeat: Keep VF-safe behavior by preserving `data-testid` hooks and confirm handlers while refactoring only sheet composition/tokens/copy.
- Exploration notes: Verified Playwright viewport capture at `390x844` / `DPR 3` works deterministically when FE/BE readiness gates pass; ruled out marking QA failures from `ERR_CONNECTION_REFUSED` or browser bootstrap errors as product regressions.
- Prevention rule: Before any VF phase exit, enforce this sequence: quality gates -> backend/ frontend readiness gate -> phase QA -> phone screenshot artifact capture.
- Files/areas affected: `frontend_new/src/features/transactions/components/TransactionTagSelectorDialog.tsx`, `frontend_new/src/features/transactions/components/TransactionEditDialog.tsx`, `frontend_new/src/pages/TransactionsPage.tsx`, `frontend_new/docs/visual-audit/vf-4-after/tag-selector-dialog-vf4.png`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-05-30 - Iteration VF-5 (Analytics Dashboard Alignment)

- Scope: Align `AnalyticsPage` to `analytics_with_transactions_nav` while preserving FR-018..FR-022 behavior, including date-range recompute and category drilldown context.
- What went wrong: Initial visual pass caused summary income/expense values to overlap inside the two-column balance card.
- Root cause: Large typography combined with long `AED` currency code strings exceeded available column width in a constrained mobile viewport.
- Guardrail to apply next time: For two-column metric cards on mobile, size text from realistic worst-case strings (`AED 18,000.00`) first, then scale up only after screenshot verification.
- Validated pattern to repeat: Keep FR safety during VF work by retaining existing analytics `data-testid` selectors and recompute logic while iterating only on layout and token-level styling.
- Exploration notes: Verified `qa:phase3` still passes with forced 500 and retry flow after visual refactor; ruled out treating expected QA-forced 500 console/network entries as regressions.
- Prevention rule: After any typography-heavy visual change, run a 390x844 screenshot before phase QA to catch overflow defects early.
- Files/areas affected: `frontend_new/src/pages/AnalyticsPage.tsx`, `frontend_new/docs/visual-audit/vf-5-after/analytics-dashboard-vf5.png`, `docs/tasklist.md`, `frontend_new/GUARDRAILS.md`.

## 2026-07-11 - Iteration Phone QA Feedback Loop

- Scope: Add the canonical `frontend_new` phone QA harness, Telegram viewport fixture, transaction-sheet constraints, and real-device tunnel launcher; exclude AI Chat from this visual matrix.
- What went wrong: Browser `vh` resolved larger than Telegram's usable viewport, and a nested flex column prevented the category list from scrolling, hiding its sticky confirmation action below the phone screen.
- Root cause: Transaction sheets relied on browser viewport units and omitted `min-h-0` at the flex boundary that owns the scroll region.
- Guardrail to apply next time: Size Telegram sheets from `--mt-viewport-stable-height` and put `min-h-0` on every flex ancestor above an `overflow-y-auto` sheet body.
- Validated pattern to repeat: Run `scripts/run_frontend_mobile_qa.sh` on isolated ports before visual sign-off; review its screenshots and treat selector/edit action reachability as a release gate.
- Exploration notes: The four-profile matrix passed after using a Telegram WebApp fixture and explicit sheet CSS classes; a real device run remains the native Telegram verification step.
- Prevention rule: Do not use a broad Playwright route glob that can intercept Vite source modules; match only concrete `/api/...` endpoints.
- Files/areas affected: `frontend_new/scripts/qa/**`, `scripts/run_frontend_*_qa.sh`, `scripts/run_telegram_device_qa.sh`, transaction sheet components, `frontend_new/AGENTS.MD`, `frontend_new/docs/**`, `docs/tasklist.md`.

## 2026-07-11 - Iteration TWA-1 Native Navigation

- Scope: Replace duplicate Telegram web chrome and route-level sheets with full-page transaction/analytics flows, host BackButton return on nested routes, persistent primary navigation, and keyboard-aware focus positioning.
- What went wrong: The first page-mode editor mounted while closed and intercepted transaction-row taps; the initial page conversion also retained duplicate in-page back/close controls.
- Root cause: A dialog-to-page conversion needs an explicit closed render guard, and dialog navigation controls cannot be carried into a host-BackButton page unchanged.
- Guardrail to apply next time: In page presentation mode, return no DOM when closed and remove every HTML control whose sole purpose is returning/closing; keep only domain actions such as Save, Update, and destructive confirmation.
- Validated pattern to repeat: Keep parent route components mounted under wildcard routes, preserve their state, and overlay URL-backed full pages so history return restores filters, scroll position, and date range.
- Exploration notes: Four-profile Telegram-fixture QA passed after simulating keyboard viewport shrink, BackButton clicks, and no-custom-nav assertions; real Telegram iPhone validation remains required before claiming client-native parity.
- Prevention rule: Persist phase and mobile QA JSON reports to `.codex-tmp` in addition to stdout, because immediate Node process termination can drop the report in this runtime.
- Files/areas affected: `frontend_new/src/app/**`, `frontend_new/src/pages/**`, transaction and analytics page surfaces, `frontend_new/src/services/telegram/**`, `frontend_new/scripts/qa/**`, `scripts/run_frontend_*_qa.sh`, `frontend_new/docs/**`, `docs/tasklist.md`.

## 2026-07-11 - Iteration TWA-1 Navigation, Fullscreen, and Safe-Area Correction

- Takeaway: Keep the four-tab navigation on Telegram primary pages; hide it only for nested full-page flows where the host BackButton owns return navigation.
- Root cause: A root-launcher-only shell removed the expected tab control, and primary route roots with `min-h-full` were allowed to shrink, leaving lower transaction controls underneath the fixed navigation.
- Guardrail: Add `shrink-0` to primary page roots inside the scrollable shell and verify a last-row action can scroll fully above the fixed navigation before declaring a layout change complete.
- Exploration: Bot API 7.7+ `disableVerticalSwipes()` and Bot API 8.0+ `requestFullscreen()` are version-gated host requests; Telegram may still expose header controls or decline fullscreen, so always preserve normal-host layout.
- Prevention rule: In the Telegram fixture, set safe-area CSS variables after `DOMContentLoaded`; then run the four-profile mobile matrix plus Phase 2, Phase 3, and Phase 5 before handoff.

## 2026-07-11 - Iteration TWA-1 Primary-Page Host-Control Clearance

- Scope: Prevent Telegram's native Close/menu controls from overlapping the top of Transactions, Analytics, Settings, and AI Chat in fullscreen Telegram launches.
- What went wrong: Real iPhone screenshots showed primary content beginning inside the visible native control area even though the CSS safe-area inset was applied.
- Root cause: Telegram can report a content-safe top inset that is smaller than the physical launch-control overlay, particularly around fullscreen transitions.
- Guardrail to apply next time: Reserve `max(contentSafeAreaInset.top, 5rem)` plus the normal 1rem content gutter through the shared Telegram shell and inherited fixed-page inset; do not make individual-page offset fixes.
- Validated pattern to repeat: Assert the first primary control on all four tabs starts below the 96px host-control clearance in every mobile-fixture profile, then review representative screenshots.
- Exploration notes: The earlier four-profile mobile harness and Phase 2/3/5 checks passed; rerun them after changing the clearance threshold. A real Telegram iPhone run remains required because the local fixture cannot render native Telegram controls.
- Prevention rule: Evaluate lifecycle state before fixture-resetting `page.goto()` calls, or persist the fixture state across navigations; otherwise BackButton assertions can produce false failures.
- Files/areas affected: `frontend_new/src/app/layout/AppShell.tsx`, `frontend_new/src/styles.css`, `frontend_new/scripts/qa/mobile.mjs`, `frontend_new/src/pages/SettingsPage.tsx`, `docs/tasklist.md`.

## 2026-07-12 - Iteration TWA-1 Shared Skill Capture

- Takeaway: Promote reusable Telegram navigation, viewport, and fixture lessons into `.agents/skills/telegram-mini-app/`; keep device-specific spacing values in the consuming project.
- Exploration: Confirmed Bot API 7.7 introduces vertical-swipe control and Bot API 8.0 introduces fullscreen, safe-area fields, and fullscreen events; validated the edited skill with `quick_validate.py`.
- Prevention rule: Treat content-safe insets as a minimum, measure the host-control reserve on a real target client, and keep the reserve configurable rather than copying a prior product's pixels.

## 2026-07-12 - Iteration VF-6 Analytics Drilldown Alignment

- Takeaway: Preserve the newer Telegram full-page route/host BackButton contract when aligning an older popup draft; port the draft's visual hierarchy, not its obsolete navigation chrome.
- Exploration: The dark category hero, signed category total, compact tags/date metadata, separators, and chevrons passed the component test, Phase-3 FR matrix, and all four mobile fixture profiles. The real-device command correctly stopped because `TELEGRAM_DEVICE_NGROK_DOMAIN` is unset.
- Prevention rule: If a phase runner reuses a local service and reports CORS failures, classify it as runtime ownership first; rerun on fresh isolated ports with the runner's explicit `CORS_ALLOW_ORIGINS` contract before changing product code.

## 2026-07-12 - Central Bug-Fix Iteration Planning

- Takeaway: Group related UX defects by shared route/component and regression suite; keep overview limits, detail routes, and chart interaction as separate delivery slices.
- Exploration: Mapped all seven `temp.md` items and the five Telegram iOS smoke findings to five frontend-only iterations; kept the ambiguous category-sign wording explicit as the existing category icon/color affordance.
- Prevention rule: Keep original evidence in `frontend_new/bugs_reports/`, then add every source bug ID, state, linked BFX iteration, Telegram navigation constraint, acceptance criteria, and Phase-2/Phase-3/mobile QA scope to `frontend_new/docs/bug-fix-iterations.md` before implementation starts.
