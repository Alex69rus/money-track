# Development Task List

`docs/tasklist.md` is the repository's single task and status register. Keep raw screenshots, logs, and observation-only reports in their area-specific `bugs_reports/` directory; do not create a parallel roadmap, tracker, or TODO file.

## Task register

| ID | Source / evidence | Priority | State | Summary |
| --- | --- | --- | --- | --- |
| TWA-1 | Telegram phone-fixture QA and iPhone feedback | P1 | Fixed — verification pending | Telegram-native route/navigation implementation needs a real iPhone smoke test. |
| FE-004 | User request, pending issue 4 | P2 | Fixed — verification pending | Open the existing transaction editor from an Analytics drilldown row. |
| BR-007 | `frontend_new/bugs_reports/native-date-control-findings-2026-07-12.md` | P2 | Fixed — verification pending | Keep datepicker opening stable and add a reliable per-field clear action. |
| BFX-1 | TEMP-001..003, BR-004 | P2 | Fixed — verification pending | Transaction-card edit interaction and category affordances. |
| BFX-2 | TEMP-004, TEMP-005 | P2 | Fixed — verification pending | Analytics category/tag drilldown parity. |
| BFX-3 | TEMP-006, BR-001..003 | P2 | Fixed — verification pending | Bounded Analytics widgets and functional View all routes. |
| BFX-4 | TEMP-007 | P2 | Fixed — verification pending | Monthly Trends exact-value disclosure. |
| BFX-5 | BR-005 | P2 | Fixed — verification pending | Bounded Transactions tag filtering. |
| BFX-6 | FUP-001..004 | P2 | Fixed — verification pending | Follow-up filter, date-surface, and analytics sizing clarity. |
| BFX-7 / BR-006 | `frontend_new/bugs_reports/phase-qa-findings-2026-07-12.md` | P2 | Verified | Repair the stale Phase-5 tag integration gate. |
| QA-1 | Iteration retrospective, 2026-07-13 | P3 | Verified | Harden local frontend QA stack startup, reuse, and cleanup contracts. |
| TST-1 | Pending issue 1 | P3 | Verified | Move frontend tests to `frontend_new/tests/`. |
| DOC-1 | Pending issues 2–3 | P3 | Verified | Complete the redesign audit and consolidate the frontend harness. |
| BE-001 | `origin/main` checkpoint, 2026-05-07 | P3 | Verified | Add Telegram callback diagnostics to distinguish delivery, parsing, validation, and action failures. |
| DEP-1 | User request, deployment audit 2026-07-13 | P1 | Ready — uncommitted | Deploy the Vite redesign automatically after a merge to `main`, retaining the legacy frontend as rollback. |
| BR-008 | `frontend_new/bugs_reports/docker-frontend-runtime-findings-2026-07-14.md` | P1 | Won't fix | Initial local smoke test raced Nginx startup; rerun verified the image, revision probe, and SPA route. |
| BR-009 | `frontend_new/bugs_reports/ci-frontend-checks-findings-2026-07-14.md` | P1 | Fixed — CI verification pending | Use TypeScript-ESLint's project service so aliases resolve under both local and GitHub Actions type-aware linting. |

## TWA-1 — Telegram-native route and viewport validation

### Problem

Browser and Telegram-fixture checks passed, but client-specific behavior still needs physical Telegram iPhone confirmation.

### Required behavior

- Telegram opens Transactions and retains the four primary destinations in bottom navigation.
- Nested edit, selector, and drilldown routes use host BackButton and return without losing parent state.
- Safe-area, host-control clearance, keyboard positioning, vertical-swipe suppression, and fullscreen fallback remain usable in the native client.

### Acceptance criteria

- A real Telegram iPhone smoke test is recorded using the configured test bot and `TELEGRAM_DEVICE_NGROK_DOMAIN`.
- The result identifies any device-only exception; passing browser emulation alone does not close this task.

### Verification status

Four phone-fixture profiles and the browser phase suites passed. The task is blocked only on the missing reserved Telegram test-bot domain.

## FE-004 — Edit transactions from Analytics drilldowns

### Problem

Analytics category and tag drilldowns show read-only transaction rows. A user must leave the drilldown and find the transaction again to edit it.

### Required behavior

- Provide a clear, accessible edit action from each transaction row in category and tag drilldowns.
- Open the existing transaction edit route with the selected transaction prefilled; do not duplicate the editor or transaction mutation logic.
- Return to the same drilldown and Analytics date context after save, delete, or cancel through the established Telegram BackButton/browser-history contract.

### Acceptance criteria

- Category and tag drilldown rows open the correct transaction editor.
- Save and delete reflect in the drilldown and preserved Analytics context without a full document reload.
- Read-only row semantics remain clear until the explicit edit action is used.
- Phase-2 and Phase-3 coverage protects the edit handoff, return state, and mutation result; mobile QA confirms controls remain reachable.

### Likely boundaries

- `frontend_new/src/features/analytics/components/CategoryDrilldownDialog.tsx`
- `frontend_new/src/pages/AnalyticsPage.tsx`
- Existing transaction edit route state in `frontend_new/src/pages/TransactionsPage.tsx` or a shared route-state adapter
- Phase-2/Phase-3 and mobile QA modules

### Acceptance and delivery record

Each category and tag drilldown row now has an accessible edit action that opens the existing full-page transaction editor with the selected transaction. Analytics route state carries its active date range through the editor and host BackButton return. The editor now initializes once per transaction ID, so an in-flight list refresh cannot discard an edit made immediately after opening from Analytics. Phase-3 verifies editor identity, save-and-return with the changed row visible, delete-and-return with the row removed, and preserved date context; Phase-2 verifies the shared editor's standard mutation paths. The 27-test unit suite, lint, typecheck, build, and all four phone-fixture profiles passed. Physical Telegram confirmation remains pending because `TELEGRAM_DEVICE_NGROK_DOMAIN` is not configured.

## BR-007 — Native datepicker scroll and reset

### Problem

Opening the datepicker can scroll the screen far from its field, and its reset control does not work as expected.

### Required behavior

- Native date-picker focus must not invoke the shared keyboard-focus scroll adjustment.
- A populated date field must expose a clear action that is reachable above the transparent native picker overlay.
- Clearing a date changes only that field and updates the visible app-rendered value immediately.

### Acceptance criteria

- Text and date-time editing fields keep their existing focus positioning behavior.
- Transactions and Analytics clear controls update their own query state without altering the companion date.
- Component tests and phone QA cover scroll stability, clear interaction, and constrained date-field layout.

### Acceptance and delivery record

Native date inputs opt out of the shared editable-field focus positioning, while text, date-time, textarea, and select behavior remains unchanged. Populated Transactions and Analytics date surfaces expose their own visible clear button above the transparent native-picker overlay; clearing one value preserves the companion date and updates the rendered label. Unit, Phase-2, and four-profile phone-fixture checks cover the editor/filter paths, direct date-focus scroll stability, clear actions, containment, and Analytics drilldown reachability. Lint, typecheck, build, and all 27 unit tests passed. Physical Telegram confirmation remains pending because `npm run qa:telegram-device` correctly stops until `TELEGRAM_DEVICE_NGROK_DOMAIN` is configured.

## BFX-1 — Transaction-card edit interaction and category affordances

Source bugs: TEMP-001, TEMP-002, TEMP-003, BR-004.

### Problem and required behavior

Leaf categories showed a misleading chevron; mobile transaction cards needed an Edit button; uncategorized rows resembled real categories; and signed amounts could split on narrow phones. Leaf categories must be directly selectable, card tapping must open full edit without swallowing category/tag quick actions, the unassigned state must be explicit, and amounts must remain non-wrapping.

### Acceptance and delivery record

Leaf rows no longer expose a false expand affordance; card, category, and tag actions are independently reachable; the mobile Edit button is absent; and large signed amounts remain intact. Unit tests, Phase-2 QA, and all four phone-fixture profiles passed. Real-device verification remains pending under TWA-1.

## BFX-2 — Analytics category and tag drilldown parity

Source bugs: TEMP-004, TEMP-005.

### Problem and required behavior

Tag spending lacked a drilldown, while category drilldown rows lacked the category icon/color treatment used elsewhere. Both category and tag items must open a shared full-page, date-context-preserving drilldown with consistent read-only transaction rows.

### Acceptance and delivery record

Both drilldowns render filtered transactions, category-aware rows, aggregate context, and Telegram BackButton return. Unit tests, Phase-3 QA, and four phone-fixture profiles passed. Real-device verification remains pending under TWA-1.

## BFX-3 — Bounded Analytics widgets and View all

Source bugs: TEMP-006, BR-001, BR-002, BR-003.

### Problem and required behavior

Category/tag widgets could grow unbounded or scroll internally, their View all controls were inert, the preset row exposed a scrollbar, and summary/trend cards could clip. Overview widgets must show only five items, page scrolling must own overflow, and full lists must be route-backed and preserve the active range.

### Acceptance and delivery record

Six-item fixtures show five overview rows, every item is reachable through View all, the preset scrollbar is hidden, and cards retain visible body content. Phase-3 and four-profile phone-fixture QA passed. Real-device verification remains pending under TWA-1.

## BFX-4 — Monthly Trends value disclosure

Source bug: TEMP-007.

### Problem and required behavior

Bar height alone did not expose exact monthly income and expenses. Every month must be selectable by touch and keyboard, with a persistent selected-month value summary.

### Acceptance and delivery record

The newest month selects by default, selection is retained or predictably replaced after recomputation, and exact values remain in normal card flow. Unit tests, Phase-3 QA, and four phone-fixture profiles passed. Real-device verification remains pending under TWA-1.

## BFX-5 — Bounded Transactions tag filtering

Source bug: BR-005.

### Problem and required behavior

Rendering the whole tag catalogue inline could make filters unusable. The compact filter must show at most five suggestions, preserve selected tags, handle long labels, and provide a searchable full-page selector for the entire catalogue.

### Acceptance and delivery record

Large-catalogue tests verify the five-chip bound, selected-count recovery, searchable full selector, disabled filter-tag creation, and no horizontal overflow. Unit tests, Phase-2 QA, and four phone-fixture profiles passed. Real-device verification remains pending under TWA-1.

## BFX-6 — Follow-up UI clarity and natural Analytics sizing

Source bugs: FUP-001, FUP-002, FUP-003, FUP-004.

### Problem and required behavior

The Transactions filter repeated its purpose, date surfaces needed phone containment, Analytics cards carried excess empty space, and selected-month context was ambiguous. The delivered behavior uses concise filter copy, safe rendered date surfaces, natural card height, and a clear full month/year selection label.

### Acceptance and delivery record

Lint, typecheck, 22 unit tests, build, Phase-2/Phase-3 QA, and four phone-fixture profiles passed. Real-device verification remains pending under TWA-1.

## BFX-7 / BR-006 — Phase-5 tag integration regression gate

### Problem

Phase-5 QA still waited for a retired filter-tag test hook after BFX-5, preventing its requirement matrix from running.

### Required behavior

The gate must test the current accessible filter-tag control and confirm `/api/tags` options are available to both filter and transaction-edit selectors.

### Acceptance and delivery record

The retired hook was replaced with the `Add <tag> filter tag` accessible name. Lint, typecheck, 22 unit tests, build, and the complete Phase-5 matrix passed at 390×844 / DPR 3. This harness task is verified.

## QA-1 — Frontend QA stack ownership

### Problem and required behavior

The phase and mobile root scripts had separate backend startup settings, implicitly reused any service on the default ports, and cleaned up only their shell-parent processes. A mobile-run backend could therefore be reused without the browser phase's CORS contract, while interrupted runs could leave child services behind.

### Acceptance and delivery record

Both commands now source one stack helper that uses identical development authentication, webhook, CORS, and workspace-local `UV_CACHE_DIR` settings. A complete running stack is reused only with explicit `QA_REUSE_SERVICES=1` and a CORS preflight; partial or accidental stacks fail fast. Normal cleanup walks started process trees. Shell syntax and the stack decision matrix passed; Phase-2 and an iPhone 12 Pro mobile profile passed through fresh shared-stack startups, with the latter confirming the prior run had cleaned up. The mobile geometry assertion now allows a small subpixel tolerance while retaining its usable-region check. Browser sandbox escalation remains documented as a macOS environment requirement.

## TST-1 — Frontend test-suite layout

### Delivery record

All twelve frontend tests and shared setup moved from `src/` into the mirrored `frontend_new/tests/` tree. The browser QA runner, fixture, mobile matrix, and phase modules now live under `frontend_new/tests/qa/`; package commands and evidence references were updated. Lint, typecheck, 22 tests, build, and the complete Phase-5 matrix passed at 390×844 / DPR 3. The sandboxed backend bootstrap panicked in `uv`'s macOS system-configuration dependency; the unchanged escalated runner passed, classifying it as an environment-only exception.

## DOC-1 — Redesign audit and harness consolidation

### Delivery record

The redesign audit found no missing planned frontend feature. Historical visual drafts, comparison captures, duplicate task files, and stale guidance were removed. Current functional requirements and user flows are the product contract; `docs/tasklist.md` is the sole task register.

## BE-001 — Telegram callback diagnostics

### Delivery record

`main` adds backend-owned webhook status logging at runtime startup, including pending updates, allowed update types, the last Telegram error, and a warning if callback queries are missing. This merge retains that diagnostic behavior alongside the redesign's Telegram Web App menu-button configuration.

## DEP-1 — Production redesign frontend cutover

### Problem

The production workflow still validated, built, and deployed frozen `frontend/`. `frontend_new/` had no production container, the backend defaulted Telegram's Web App menu to a development tunnel, and the existing deployment could report success after a failed health check.

### Required behavior

- A merge to `main` must validate the redesign and deploy a separate immutable ARM64 `frontend-new` image.
- Production must make same-origin `/api` requests, configure the Telegram Web App menu URL from the production domain, and set the explicit CORS origin.
- The legacy source and image must remain available as a frontend-only rollback target.
- The deployment must fail on a bad frontend revision, SPA route, backend health check, or Telegram URL registration.

### Delivery and verification record

`frontend_new` now contains a Node 20/Vite build image, Nginx SPA fallback, immutable asset caching, and a non-sensitive `/version.json` revision probe. The production workflow validates lint, typecheck, tests, build, and a Docker image build before publishing `ghcr.io/alex69rus/money-track/frontend-new:<commit-sha>`. Its deployment script derives `TELEGRAM_WEB_APP_URL` and `CORS_ALLOW_ORIGINS` from `DOMAIN`, saves the prior frontend digest, avoids a full-stack shutdown, and restores only the frontend if its revision or client route check fails. Deployment documentation and an untracked `.env.prod` template replace the legacy CRA configuration.

YAML parsing, deployment-script shell parsing, Compose rendering, and the complete frontend quality suite passed: lint, typecheck, 27 unit tests, and production build. The user also completed the local Docker smoke check: the image served the supplied revision from `/version.json` and returned HTTP 200 for `/transactions`. The initial request was made before Nginx had finished starting; the deployment script already waits for the revision probe. No production deployment has run because these changes are intentionally uncommitted.

## BR-009 — Frontend validation blocks redesign pull request

### Problem

The frontend's two independent pull-request validation jobs fail, blocking the redesign from reaching the production-only build and deploy gates. The check summary is insufficient to establish whether this is a runner, dependency, or workflow configuration problem.

### Required behavior

- Both frontend validation jobs use a runtime and dependency installation compatible with the locked frontend toolchain.
- Pull-request runs continue to validate without pushing an image or deploying.

### Acceptance criteria

- GitHub Actions logs establish and verify the shared root cause.
- `Deploy to Production / validate-frontend` and `Frontend New CI / quality` succeed on PR #13.
- The production build-and-push and deploy jobs remain conditional on a merged `main` run.

### Investigation record — 2026-07-14

- The two failures are independent workflows but fail at the same `npm run lint` command after a successful `npm ci` on Node `v20.20.2`; ESLint reports 124 `no-unsafe-assignment` / `no-unsafe-call` error-typed-value findings.
- A clean `npm ci && npm run lint` passed locally. The same locked install and lint command also passed in isolated Node `20.20.2` Alpine and Debian containers, including with `CI=true`.
- The validated PR merge ref contains the same frontend ESLint configuration, package lock, and representative affected source blobs as the local branch. No code or workflow relaxation is justified until the failed GitHub jobs are retried and their new logs are checked.

### Delivery record — 2026-07-14

- Replaced ESLint's hard-coded `parserOptions.project` list with TypeScript-ESLint `projectService: true`, retaining type-aware linting and the existing `tsconfigRootDir`. The project service chooses the matching application TypeScript configuration and resolves `@/lib/utils` consistently instead of producing cascaded error-typed values at each `cn(...)` call.
- Verification: `npm run lint && npm run typecheck && npm run test:run && npm run build` — passed (27 tests); clean Node `20.20.2` Debian container with `CI=true`, `npm ci && npm run lint` — passed.
- GitHub Actions validation of PR #13 remains the required final check.

## Operating rules

- Keep each approved slice small, evidence-backed, and represented by one row plus one detail section in this file.
- Update this file when work is planned, completed, blocked, or materially re-scoped.
- Keep raw evidence in `frontend_new/bugs_reports/`; record source ID, priority, state, acceptance summary, delivery result, and verification exception here.
