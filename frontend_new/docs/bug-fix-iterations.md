# Frontend Bug-Fix Iterations

Status: planning only. This document is the central register and delivery plan for frontend defects. It converts the seven UI/UX items in the root `temp.md` and the existing Telegram iOS smoke findings into implementation-ready frontend slices. It does not authorize product-code changes by itself.

Scope: `frontend_new/**` only. Preserve the current Telegram-native page/BackButton contract, existing API boundaries, and the four approved primary destinations.

## Central Register and Tracking Policy

- Store original screenshots and observation-only reports in `frontend_new/bugs_reports/`. Do not rewrite or delete that evidence when an issue is planned or fixed.
- Track every bug's current delivery state in this file. A source bug keeps its existing ID (`BR-*`) or receives a `TEMP-*` ID when it originated in `temp.md`.
- Track implementation work as `BFX-*` iterations. One iteration may fix several source bugs only when they share a component, user flow, and regression path.
- Use the following states in the register: `New`, `Planned`, `In Progress`, `Implemented`, `Verified on device`, or `Deferred`.
- When an iteration is complete, update its linked source bugs and `docs/tasklist.md`; preserve the original report's evidence and append a verification result rather than replacing the observation.

## Source Bug Register

| Bug ID | Source / evidence | Concise defect | State | Planned iteration |
| --- | --- | --- | --- | --- |
| TEMP-001 | `temp.md` item 1 | Leaf categories display a misleading `>` affordance. | Planned | BFX-1 |
| TEMP-002 | `temp.md` item 2 | Mobile transaction cards require `Edit` instead of opening edit on card tap. | Planned | BFX-1 |
| TEMP-003 | `temp.md` item 3 | Uncategorized transaction icon looks like a valid category instead of a category-selection affordance. | Planned | BFX-1 |
| TEMP-004 | `temp.md` item 4 | Spending-by-tags lacks a transaction drilldown. | Planned | BFX-2 |
| TEMP-005 | `temp.md` item 5 | Analytics drilldown transaction rows lack the Transactions category icon/color affordance. | Planned | BFX-2 |
| TEMP-006 | `temp.md` item 6 | Analytics category/tag widgets need top-five previews and working full-list `View all` flows. | Planned | BFX-3 |
| TEMP-007 | `temp.md` item 7 | Monthly Trends lacks an interaction for reading exact month income/expense values. | Planned | BFX-4 |
| BR-001 | `bugs_reports/telegram-ios-smoke-test-2026-07-11.md`, `IMG_7773.jpeg` | Analytics date-preset row exposes a native scrollbar. | Planned | BFX-3 |
| BR-002 | `bugs_reports/telegram-ios-smoke-test-2026-07-11.md`, `IMG_7773.jpeg`, `IMG_7771.jpeg` | Balance Snapshot and Monthly Trends can collapse or clip to header-only cards. | Planned | BFX-3 |
| BR-003 | `bugs_reports/telegram-ios-smoke-test-2026-07-11.md`, `IMG_7771.jpeg` | Analytics category/tag `View all` actions are inert. | Planned | BFX-3 |
| BR-004 | `bugs_reports/telegram-ios-smoke-test-2026-07-11.md`, `IMG_7772.jpeg` | Transaction signed amount can wrap the sign onto a separate line. | Planned | BFX-1 |
| BR-005 | `bugs_reports/telegram-ios-smoke-test-2026-07-11.md`, `IMG_7774.jpg` | Transactions filters render the entire tag catalogue inline. | Planned | BFX-5 |

## Sequencing

| Iteration | Source items | Dependency | Purpose |
| --- | --- | --- | --- |
| BFX-1 | TEMP-001..003, BR-004 | None | Make transaction cards, category selection, and signed amounts unambiguous and direct. |
| BFX-2 | TEMP-004, TEMP-005 | None | Make category and tag drilldowns consistent, navigable, and transaction-row aware. |
| BFX-3 | TEMP-006, BR-001..003 | BFX-2 | Make Analytics overview widgets contained, complete, and navigable. |
| BFX-4 | TEMP-007 | None | Make Monthly Trends values understandable through direct touch interaction. |
| BFX-5 | BR-005 | None | Keep transaction tag filtering usable with large tag catalogues. |

`BFX-1`, `BFX-4`, and `BFX-5` are independent. Complete `BFX-2` before `BFX-3` so `View all` can reuse the final drilldown navigation model.

## BFX-1 — Transaction Card Interaction and Category Affordances

Source bugs: TEMP-001, TEMP-002, TEMP-003, BR-004.

### Problem

The category selector shows a right-facing arrow for leaf categories that have no children, implying a missing expandable level. Transaction mobile cards also require an explicit `Edit` button even though the card itself is the natural edit target. An uncategorized transaction currently uses a fallback letter/avatar that can look like a valid category rather than an invitation to categorize it. The signed amount can also split its sign from the currency/digits on a narrow phone.

### Required behavior

- A category with no children is a direct selection target. It must not show an expand/navigation chevron. A selected leaf may show the existing selected state instead.
- Tapping the non-interactive area of a mobile transaction card opens that transaction's full edit page.
- The category control remains an independent quick-category target, and the tag add/edit control remains an independent tag-edit target. Tapping either must not also open full edit.
- Remove the per-card mobile `Edit` button after card-tap edit is available.
- An uncategorized transaction's category control must use an explicit neutral/unassigned affordance (for example `?`) and an accessible label that clearly communicates `Choose category`; it must not derive a category-looking initial from the note.
- Render sign, currency, digits, and decimal portion as one non-wrapping amount value. The note/title must truncate or yield before the signed amount does, including for realistic large positive and negative values.
- Keep desktop table behavior out of this slice unless its equivalent affordance is required to preserve accessibility.

### Acceptance criteria

- Leaf category rows contain no misleading chevron in normal, selected, and search states.
- Parent category rows retain their expand/collapse affordance and children remain selectable.
- Card tap opens the correct `/transactions/:id/edit` route.
- Category and tag taps open only their own selector routes; no parent-card edit is triggered.
- The mobile edit button is absent.
- Uncategorized cards show the chosen unassigned-state icon/text, and category selection remains reachable.
- Small and large positive/negative amounts stay on one line with no clipped or separated sign.
- Mobile transaction card edit/category/tag flows continue to pass Phase-2 and phone QA.

### Likely boundaries for the implementation agent

- `features/transactions/components/TransactionsMobileList.tsx`
- `features/transactions/components/TransactionCategorySelectorDialog.tsx`
- Existing transaction route callbacks in `pages/TransactionsPage.tsx`
- Phase-2 and mobile QA assertions for row tap versus nested controls.

## BFX-2 — Analytics Category and Tag Drilldown Parity

Source bugs: TEMP-004, TEMP-005.

### Problem

Spending-by-tags has no transaction drilldown. The category drilldown shows a simplified transaction row that is visually and semantically inconsistent with Transactions: it does not expose the transaction's category sign/icon for each row. In this plan, *category sign* means the category icon and color/state affordance already used by a Transactions row.

### Required behavior

- Tapping a tag item on Analytics opens a tag-filtered transaction drilldown for the current date range.
- Category and tag drilldowns must use the same read-only analytics transaction-row presentation. Each row shows its category icon/sign and category color/state using the same category semantics as Transactions, including the explicit uncategorized state.
- Keep drilldowns as Telegram full-page routes with the host `BackButton`; do not restore a duplicate HTML Close/Back control in Telegram. The browser fallback may retain its explicit dialog close affordance.
- The drilldown header identifies the selected category or tag, shows the active period and aggregated amount, and the list is vertically scrollable without an inner fixed-height widget.
- Returning must preserve the Analytics date range, scroll/context, and selected parent surface.

### Acceptance criteria

- Category and tag items both open a populated, correctly filtered drilldown from Analytics.
- Each transaction row has one consistent category sign/icon treatment, a signed amount that stays intact, tags, and timestamp metadata.
- Category and tag drilldowns use the current date range and show correct aggregate totals/counts.
- Telegram host BackButton returns to the same Analytics state; browser fallback has an explicit close route/action.
- Empty, loading, and error states remain clear and recoverable.
- Phase-3 QA covers category and tag drilldown routes, BackButton lifecycle, context preservation, and row category affordances; mobile QA verifies no overflow/clipping.

### Likely boundaries for the implementation agent

- `features/analytics/components/CategoryDrilldownDialog.tsx` or a renamed/shared analytics drilldown surface
- `features/analytics/types.ts` and `utils.ts` for tag-to-transactions aggregation
- `pages/AnalyticsPage.tsx`, route parsing, and `services/telegram/navigation.ts`
- A shared presentational transaction-row component; do not import edit/quick-action behavior into Analytics read-only rows.

## BFX-3 — Bounded Analytics Widgets and Functional View All

Source bugs: TEMP-006, BR-001, BR-002, BR-003.

### Problem

The category and tag widgets can become arbitrarily tall or rely on a scrollable inner surface. Their visible `View all` actions are not implemented, so users cannot reach a complete breakdown. The date-preset row exposes a native scrollbar, and Balance Snapshot or Monthly Trends can collapse to a title-only strip or be covered/clipped near Telegram navigation.

### Required behavior

- The Analytics landing widgets show at most the top five category items and top five tag items for the active date range.
- Neither overview widget may scroll internally. The page owns vertical scrolling and each widget has the natural height of its five rows, loading state, empty state, or error state.
- Keep the horizontally swipeable date-preset row, but visually hide its native scrollbar/track without creating page-level horizontal overflow.
- Balance Snapshot and Monthly Trends must reserve enough vertical space for their body, loading, empty, or error state. They must never silently collapse to a header-only strip or sit behind bottom navigation.
- `View all` opens a full-page category or tag breakdown that contains every aggregated item for the active range, is vertically scrollable, and returns through the Telegram host BackButton.
- The full-list page must be a clear exploration surface: heading, active period, item amount/count, and a row action that opens the corresponding BFX-2 transaction drilldown.
- Retain the complete category/tag aggregation separately from the overview top-five subset. `View all` must never be derived from already-truncated widget data.

### Acceptance criteria

- Six or more categories/tags produce exactly five visible overview rows in each widget.
- The sixth and later items are reachable from the matching `View all` route.
- Both `View all` actions work, preserve the date range, and have no nested widget scrollbar.
- The preset scrollbar is not visible in Telegram/iOS, while every preset remains reachable by horizontal swipe.
- Balance Snapshot and Monthly Trends show meaningful body content or an intentional state on every supported phone profile.
- Full-list rows open the correct category/tag transaction drilldown and return losslessly through Analytics.
- No internal widget clipping occurs on iPhone SE through iPhone 15 Pro Max.
- Phase-3 and mobile QA cover the top-five limit, both `View all` routes, full-list scrolling, drilldown handoff, and date context preservation.

### Likely boundaries for the implementation agent

- `pages/AnalyticsPage.tsx`
- Analytics aggregation types/utilities; preserve complete data for exploration routes
- New route-backed full-list surface(s) under `features/analytics/components/`
- Analytics Phase-3 and mobile QA fixtures.

## BFX-4 — Monthly Trends Value Disclosure

Source bug: TEMP-007.

### Problem

Monthly Trends communicates income and expense only through bar height and color. On a phone, users cannot reliably infer exact values.

### Required behavior

- Every month column is directly selectable by touch and keyboard; do not make exact values hover-only.
- Selecting a month reveals an anchored, readable value summary for that month: month label, income, and expense in the active currency.
- The latest visible month is selected by default. If date filtering changes the trend series, retain the selected month when it still exists; otherwise select the newest visible month.
- The selected state is visually distinct without obscuring bar height, and includes accessible name/state semantics.
- Keep the existing loading, error, empty, and responsive trend behavior intact.

### Acceptance criteria

- Touch/click and keyboard activation select each visible month.
- The value summary always reports the selected month's exact income and expense; it updates when selection changes.
- No tooltip/summary is clipped by the card, Telegram bottom navigation, or the small-phone viewport.
- Date-range recomputation updates the selectable series and selection predictably.
- Phase-3 and mobile QA cover selection, exact values, keyboard accessibility, narrow layouts, and no-data handling.

### Likely boundaries for the implementation agent

- `pages/AnalyticsPage.tsx`
- Analytics trend model/utilities only if a presentational value is missing
- Phase-3 and mobile QA assertions for month selection/value disclosure.

## BFX-5 — Bounded Transactions Tag Filter

Source bug: BR-005.

### Problem

The Transactions filter renders the entire user tag catalogue as inline chips. Large or system-generated tag sets make the filter extremely long, hide transaction content, and can create overflow from long labels.

### Required behavior

- The default filter view shows at most five suggested/unselected tag chips. It must never render the full catalogue inline by default.
- Selected tags remain identifiable and removable. When selected tags exceed the compact presentation budget, show a clear selected-count control that opens the full selector instead of allowing an unbounded chip region.
- Provide an explicit `Show all tags` / `Edit tags` path to a searchable, scrollable selector surface. In Telegram this must follow the established full-page route and host BackButton contract.
- Long tag labels truncate safely and do not produce horizontal page overflow.
- Preserve auto-applied filtering and the currently selected tags after opening, searching, confirming, and returning from the full selector.

### Acceptance criteria

- A fixture with hundreds or thousands of tags renders only the bounded compact subset initially.
- Long system/test tags do not enlarge the filter card or cause horizontal overflow.
- Search and the explicit full-selector action can find and apply any available tag.
- Existing selected tags remain visible/removable in compact form or are reachable through a clearly labelled selected-count control.
- Tag filtering still auto-applies, survives return navigation, and works on iPhone SE through iPhone 15 Pro Max.
- Transaction-filter regression tests and mobile QA cover the compact subset, full selector, long labels, selected-state recovery, and large catalogues.

### Likely boundaries for the implementation agent

- `features/transactions/components/TransactionsFiltersCard.tsx`
- Existing tag selector route/component and filter state in `pages/TransactionsPage.tsx`
- Transaction filter tests/QA and the mobile fixture tag catalogue.

## Shared Regression Rules

- Work in `frontend_new/**`; do not modify frozen legacy `frontend/**`.
- Preserve TWA-1: four primary tabs, full-page nested routes, host BackButton, safe-area clearance, and browser fallback behavior.
- Keep each iteration independently shippable: implement its tests and relevant Phase-2/Phase-3 plus mobile QA before taking the next iteration.
- Record a real Telegram iPhone result when the reserved tunnel domain is available; otherwise state the missing-domain exception explicitly.
