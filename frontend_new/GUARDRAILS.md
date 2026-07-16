# `frontend_new` Guardrails

Keep this file concise. Record only a rule that prevents a repeatable failure; keep task status in `docs/tasklist.md` and raw evidence in `bugs_reports/`.

## Navigation and state

- Keep parent routes mounted under wildcard routes so nested full-page flows return without losing filters, scroll position, or date range.
- Render a nested full-page surface only while it is open. Let Telegram BackButton own return navigation and omit duplicate HTML close controls in Telegram mode.
- Keep the four primary destinations visible in bottom navigation; hide it only for nested flows or while the keyboard is open.

## Telegram layout

- Size pinned controls from the stable Telegram viewport, not `100vh` or transient viewport height.
- Put `min-h-0` on flex ancestors above a scrollable sheet/page body and verify sticky actions remain reachable on the smallest supported phone.
- Reserve the shared top host-controls clearance on every primary and fixed nested page; do not add one-off per-page offsets.
- Treat browser emulation as supporting evidence only. State the missing real-device condition when it cannot be run.

## UI and data

- Preserve existing callbacks and `data-testid` hooks through visual refactors, then verify the real interaction contract.
- Keep bounded previews separate from complete data used by route-backed exploration or drilldowns.
- Keep category/tag quick actions above a card-wide edit action so nested controls do not trigger editing.
- Prefer normal card-flow disclosures over hover-only or floating mobile UI.

## Tests and QA

- Add tests under the matching `tests/` path and keep `tests` in `tsconfig.app.json`.
- Keep QA selectors behavior-focused. Prefer roles and accessible names to a hook tied to a retired layout.
- Run one QA runtime owner at a time. Classify a failure as startup, sandbox, connectivity, environment, or contract before changing code.
- Persist only net-new lessons after an iteration; remove a rule when a better, current rule supersedes it.

## Latest iteration — 2026-07-12

- Takeaway: Assert bounded filter choices through their accessible button name, not a layout-specific test ID.
- Exploration: Phase-5 passed all five requirements after its stale pre-BFX selector was replaced; no application tag behavior changed.
- Prevention rule: Run the matching root-owned phase gate after any component test-hook or bounded-list contract change.

## Analytics editor and native date fields — 2026-07-12

- Takeaway: Initialize an editor draft once per opened transaction ID; do not reset it when the same ID is refreshed into the list.
- Exploration: Verify Analytics drilldown → editor save/delete → host-back return in Phase-3, not only the route transition.
- Prevention rule: Mark transparent native date inputs to skip keyboard-focus scrolling and keep their clear action above the picker overlay; cover both with phone-fixture QA.

## Test-harness layout — 2026-07-12

- Takeaway: Keep browser QA modules under `tests/qa/` with the unit-test suite, not under a separate frontend scripts tree.
- Exploration: The preserved runner/module hierarchy worked unchanged after package commands moved to `tests/qa/run-phase.mjs`; lint, typecheck, 22 tests, build, and Phase-5 all passed.
- Prevention rule: Update package commands and every evidence/document pointer when moving test harness files, then execute the affected root-owned phase gate.

## QA stack ownership — 2026-07-13

- Takeaway: Start phase and mobile QA through the shared root stack helper so backend CORS, development auth, and `uv` cache settings cannot drift.
- Exploration: Treat a reused or partial localhost stack as an environment failure; do not infer its API configuration from an open port.
- Prevention rule: Reuse a QA stack only with `QA_REUSE_SERVICES=1`, rerun browser QA with elevated local-process permission when macOS sandboxing blocks Chromium, and use a small tolerance for browser-reported geometry.

## Mobile category and trend summaries — 2026-07-14

- Takeaway: Decide whether a transaction is categorized from `categoryId`, not whether its category has a configured icon.
- Exploration: A selected category without an icon rendered readable category initials at 390×844 / DPR 3, while the `?` glyph remained exclusive to an uncategorized row; the trend summary fit the full month and signed net number without a label in one header row.
- Prevention rule: Cover one- and two-word iconless category initials, plus the label-free selected-month net summary, in component tests and the phone fixture.

## Transactions snapshot and category fallbacks — 2026-07-15

- Takeaway: Derive the Transactions monthly snapshot from the complete current-month Analytics query and model, never from a filtered or paginated list page.
- Exploration: Audit the Transactions list, editor, category selector, Analytics overview, category/tag drilldowns, and View all; each needs the same configured-icon or category-initials contract.
- Prevention rule: Render category icons through `CategoryIconGlyph`, preserve `?` only for uncategorized transactions, and run Phase-2 plus Phase-3 after changing the shared snapshot or glyph behavior.

## Filter selectors and localized amount editing — 2026-07-15

- Takeaway: Keep category and tag filtering on their existing searchable full-page selectors; compact filters should only summarize, open, and clear those selections.
- Exploration: iPhone decimal keypads emit a comma and omit minus; a text input with `inputMode="decimal"` can normalize the comma, while an explicit income/expense control supplies the sign.
- Prevention rule: For mutually exclusive visual states, make the inactive background explicit and inspect the phone screenshot; do not rely on conflicting Tailwind background utilities to resolve at runtime.
