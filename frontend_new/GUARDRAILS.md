# `frontend_new` Guardrails

Keep this file concise. Record only a rule that prevents a repeatable failure; keep active multi-iteration status in `docs/tasklist.md` and raw evidence in `../bugs_reports/`.

## Navigation and state

- Keep parent routes mounted under wildcard routes so nested full-page flows return without losing filters, scroll position, or date range.
- Render a nested full-page surface only while it is open. Let Telegram BackButton own return navigation and omit duplicate HTML close controls in Telegram mode.
- Keep the four primary destinations visible in bottom navigation; hide it only for nested flows or while the keyboard is open.

## Telegram layout

- Size pinned controls from the stable Telegram viewport, not `100vh` or transient viewport height.
- Put `min-h-0` on flex ancestors above a scrollable sheet/page body and verify sticky actions remain reachable on the smallest supported phone.
- Reserve the shared top host-controls clearance on every primary and fixed nested page; do not add one-off per-page offsets.
- Treat browser emulation as supporting evidence only. State the missing real-device condition when it cannot be run.

## AI Chat timeline — 2026-07-26

- Takeaway: do not auto-scroll the initial welcome timeline on a short Telegram viewport.
- Exploration: the initial `scrollIntoView` shifted iPhone SE AI Chat into the 96 px host-control clearance; larger phone profiles did not reproduce it.
- Prevention rule: trigger timeline auto-scroll only after a user sends or retries a prompt, then run the full mobile matrix and inspect the iPhone SE AI Chat capture.

## AI Chat completed-history pairing — 2026-07-26

- Takeaway: submit only capped, complete user/assistant pairs; a failed visible user turn is retryable, not completed history.
- Exploration: a failed turn made the next history end with `user`, while a retried turn needed its original user bubble restored after success.
- Prevention rule: cover failed-then-new, failed-then-retry-then-follow-up, and more-than-six-turn requests in the AI Chat page test.

## AI Chat fixed-shell composition — 2026-07-26

- Takeaway: make `/chat` an `overflow-hidden` flex surface and give only its timeline `min-h-0 overflow-y-auto`; keep header and composer as shrink-proof siblings.
- Exploration: AppShell page scrolling moved the chat controls with long content, while a focused composer needs `data-skip-focus-position="true"` so the keyboard-resized flex layout retains ownership.
- Prevention rule: after chat-layout changes, assert fixed header/composer rectangles and outer/inner scroll ownership in Phase 4, then run the complete dark/light mobile matrix with a long mocked response.

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

## Transaction amount editor sizing — 2026-08-12

- Takeaway: Give the iOS amount input an explicit height equal to an explicit line-height; avoid `h-auto` for oversized native text inputs.
- Exploration: A fixed 14rem input clipped `-1500.00` beside the AED glyph, while a flexible row with a clamped font size kept the value visible at 390px.
- Prevention rule: Keep the mobile QA geometry check for an explicit input line box and a fully measured `-1500.00` value, then inspect its dedicated phone capture after amount-editor changes.

## Monthly Trends range completeness — 2026-07-16

- Takeaway: Retain every populated month in the active Analytics range; the chart's horizontal scrolling handles longer ranges.
- Exploration: A seven-month January–July fixture proved the former six-item cap silently removed January while sorting and selected-month disclosure remained correct.
- Prevention rule: Cover the earliest month in a range longer than six in the Analytics page regression before changing trend aggregation or display limits.

## Shared color-scheme palette — 2026-07-16

- Takeaway: Resolve canvas, card, input, border, and text through shared semantic tokens, then synchronize `data-mt-theme` from Telegram's color scheme.
- Exploration: Verify every primary and nested full-page surface in all phone fixtures under both dark and light palettes; visual inspection ruled out a surface-specific mismatch.
- Prevention rule: Extend the two-scheme mobile matrix and use a computed-style assertion whenever adding a structural surface or changing a theme token.

## Focused Analytics resources — 2026-07-17

- Takeaway: Keep calculations and calculation-currency selection on the backend; the frontend should consume one focused resource per widget and reuse the paginated list only for drilldowns.
- Exploration: Phase-3 verified independent widget loading/error/retry, aggregate-to-drilldown filter parity, and mutation return; the mobile fixture verified all four focused API responses across phone profiles.
- Prevention rule: When replacing a client-side aggregate, update every browser fixture to mock each new resource endpoint rather than allowing Analytics to fall through to incidental backend data.

## Exact aggregate money — 2026-07-17

- Takeaway: Preserve backend aggregate money as decimal strings through mapping and rendering; do not convert it to JavaScript `number`.
- Exploration: A value beyond the safe-integer boundary retained its cents in API mapping and formatting; only chart geometry uses a capped numeric magnitude.
- Prevention rule: Add a boundary-value mapper/formatter test whenever an endpoint introduces fixed-scale decimal money.

## Database-owned Analytics aggregation — 2026-07-18

- Takeaway: A focused Analytics widget renders a backend aggregate; it does not fetch a transaction collection to rebuild that value.
- Exploration: The four focused resources and the shared snapshot preserve widget boundaries while PostgreSQL performs filtering, aggregation, ordering, and business-local month grouping.
- Prevention rule: Reject frontend list pagination loops, `reduce`, grouping, or sorting introduced to calculate an Analytics widget; request or extend the focused backend resource instead.

## Canonical category presentation — 2026-07-19

- Takeaway: Render category identity from backend `icon` and `color` in every transaction context, while retaining the shared fallback for incomplete data.
- Exploration: The mobile list, filters, editor, desktop table, and both parent and child selector rows all consumed the same category palette; phone QA passed in light and dark themes.
- Prevention rule: Use `getCategoryIconPalette` and `CategoryIconGlyph` for new category affordances, and cover the selected Home beige (`#DCAF83`) plus fallback behavior in component tests.

## Direction-aware category selection — 2026-07-20

- Takeaway: Pass the transaction direction into the shared category selector so edit and quick-update flows expose only matching category types.
- Exploration: Component, page, and Phase-2 checks covered an expense quick update and an edit switched to income; the phone matrix rendered an expanded child row with a measurable icon-label gap.
- Prevention rule: Normalize category types at the shared selector boundary, cover both callers, and make selector-layout QA inspect an expanded child row before capturing the screenshot.

## Transaction-card category tile — 2026-07-20

- Takeaway: Match the mobile transaction-card category affordance to the selector's 44px rounded-square tile.
- Exploration: The dark and light iPhone SE fixture retained readable configured icons and iconless initials without affecting card-level editing.
- Prevention rule: Assert the shared `size-11 rounded-2xl` geometry for both categorized and uncategorized card actions, then inspect a phone screenshot.

## AI Chat extended chart composition — 2026-08-02

- Takeaway: give a long bar chart its own horizontal scroll region and fixed height; keep a time-series line full-width with sparse axis labels.
- Exploration: expanding a chart's width while retaining `aspect-video` made its height scale with every added bar. A fixed 18rem height plus `aspect-ratio: auto` kept 20 bars usable at 390×844 without page overflow.
- Prevention rule: test the chart region's scroll width, the document's non-overflow, fixed chat controls, and chart height whenever a chat visual has data-dependent width.

## AI Chat composer viewport ownership — 2026-08-02

- Takeaway: scroll a new chat response through the timeline element, never `scrollIntoView` on a descendant, so document scrolling cannot move the fixed chat shell.
- Exploration: a broad 12–20px geometry range certified a visibly flush composer; the same long response must be exercised with both full-height and normal-host stable viewports.
- Prevention rule: keep `--mt-page-gutter` at `1rem`; Phase 4 and the phone matrix must reject any composer-to-navigation gap outside that exact token’s 2px rendering tolerance, retain normal-host screenshots/measurements, and assert that `scrollIntoView` is never called.

## AI Chat generic chart series — 2026-08-02

- Takeaway: render every bar and line from generic labelled value series, reserving fixed renderer keys for internal chart plumbing only.
- Exploration: a tooltip wrapper that did not forward Recharts-injected props rendered an empty tooltip even though the chart and legend were correct; keyboard-focus QA exposed it deterministically.
- Prevention rule: forward all tooltip props through wrappers, test arbitrary series names and formatted values, and have Phase 4 focus a line chart and assert the visible tooltip includes every series label.

## Transaction refund drafts — 2026-08-14

- Takeaway: Calculate refund additions and removals in integer cents; do not use floating-point money arithmetic in the editor draft.
- Exploration: Component tests covered partial and full refunds, a rejected over-limit entry, manual amount reset, and exact restoration after removal; the phone capture kept the empty section compact at 390px.
- Prevention rule: Treat a zero transaction with refunds as Expense, hide table headings until the first row, and include refund JSON in every general transaction update payload.
