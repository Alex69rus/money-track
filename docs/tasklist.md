# Development Task List

`docs/tasklist.md` is the repository's single task and status register. Keep raw screenshots, logs, and observation-only reports in their area-specific `bugs_reports/` directory; do not create a parallel roadmap, tracker, or TODO file.

## Task register

| ID | Source / evidence | Priority | State | Summary |
| --- | --- | --- | --- | --- |
| TWA-1 | Telegram phone-fixture QA and iPhone feedback | P1 | Fixed — verification pending | Telegram-native route/navigation implementation needs a real iPhone smoke test. |
| FE-004 | User request, pending issue 4 | P2 | Pending | Open the existing transaction editor from an Analytics drilldown row. |
| FE-005 | User report, pending issue 5 | P2 | Deferred | Repair the datepicker scroll/focus and reset behavior when explicitly resumed. |
| BFX-1 | TEMP-001..003, BR-004 | P2 | Fixed — verification pending | Transaction-card edit interaction and category affordances. |
| BFX-2 | TEMP-004, TEMP-005 | P2 | Fixed — verification pending | Analytics category/tag drilldown parity. |
| BFX-3 | TEMP-006, BR-001..003 | P2 | Fixed — verification pending | Bounded Analytics widgets and functional View all routes. |
| BFX-4 | TEMP-007 | P2 | Fixed — verification pending | Monthly Trends exact-value disclosure. |
| BFX-5 | BR-005 | P2 | Fixed — verification pending | Bounded Transactions tag filtering. |
| BFX-6 | FUP-001..004 | P2 | Fixed — verification pending | Follow-up filter, date-surface, and analytics sizing clarity. |
| BFX-7 / BR-006 | `frontend_new/bugs_reports/phase-qa-findings-2026-07-12.md` | P2 | Verified | Repair the stale Phase-5 tag integration gate. |
| TST-1 | Pending issue 1 | P3 | Verified | Move frontend tests to `frontend_new/tests/`. |
| DOC-1 | Pending issues 2–3 | P3 | Verified | Complete the redesign audit and consolidate the frontend harness. |

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

## FE-005 — Datepicker scroll and reset follow-up

### Problem

Opening the datepicker can scroll the screen far from its field, and its reset control does not work as expected.

### State and next action

This task is explicitly deferred by the user. Preserve the existing date implementation and revisit only with explicit approval, including a real Telegram iPhone reproduction before changing behavior.

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

## TST-1 — Frontend test-suite layout

### Delivery record

All twelve frontend tests and shared setup moved from `src/` into the mirrored `frontend_new/tests/` tree. The browser QA runner, fixture, mobile matrix, and phase modules now live under `frontend_new/tests/qa/`; package commands and evidence references were updated. Lint, typecheck, 22 tests, build, and the complete Phase-5 matrix passed at 390×844 / DPR 3. The sandboxed backend bootstrap panicked in `uv`'s macOS system-configuration dependency; the unchanged escalated runner passed, classifying it as an environment-only exception.

## DOC-1 — Redesign audit and harness consolidation

### Delivery record

The redesign audit found no missing planned frontend feature. Historical visual drafts, comparison captures, duplicate task files, and stale guidance were removed. Current functional requirements and user flows are the product contract; `docs/tasklist.md` is the sole task register.

## Operating rules

- Keep each approved slice small, evidence-backed, and represented by one row plus one detail section in this file.
- Update this file when work is planned, completed, blocked, or materially re-scoped.
- Keep raw evidence in `frontend_new/bugs_reports/`; record source ID, priority, state, acceptance summary, delivery result, and verification exception here.
