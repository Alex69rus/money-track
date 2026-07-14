# Frontend phase-QA findings — 2026-07-12

Scope: `frontend_new` Phase-5 QA at 390×844 / DPR 3 with the local Telegram fixture, exercising the Transactions filter-tag flow.

This report records observed defects only. Do not include a fix unless the user explicitly asks for one.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `.codex-tmp/qa-phase5-report.json` | Phase-5 QA | The runner times out while waiting for a removed filter-tag test hook. |
| `tests/qa/phases/phase5.mjs` | Phase-5 tag integration assertion | The runner still queries `tx-filter-tag-option-*`. |
| `src/features/transactions/components/TransactionsFiltersCard.tsx` | Transactions filter | The bounded suggestion UI exposes `tx-filter-suggested-tag-*`. |

## BR-006 — Phase-5 tag integration gate is stale

Priority: P2

Evidence: `.codex-tmp/qa-phase5-report.json`; Phase-5 local QA run on 2026-07-12.

### Actual

The Phase-5 harness waits for `tx-filter-tag-option-phase5backendtag`, which no longer exists after the bounded tag-filter redesign. The runner times out before evaluating any of its five mapped requirements, leaving the integration gate falsely red.

### Expected

The Phase-5 tag integration assertion follows the current bounded suggestion contract and completes its FR-028, FR-030, FR-031, FR-033, and FR-040 checks.

### Reproduction

1. Run `scripts/run_frontend_phase_qa.sh phase5`.
2. Open the Transactions filter in the Telegram-fixture browser.
3. Observe the timeout waiting for `tx-filter-tag-option-phase5backendtag`.

### Acceptance criteria

- Phase-5 QA uses the current filter-tag hook or an equally behavior-focused locator.
- The tag assertion verifies that options returned by `/api/tags` are reachable in both filter and transaction-edit selector flows.
- The full Phase-5 FR matrix completes with explicit results at the standard phone viewport.
