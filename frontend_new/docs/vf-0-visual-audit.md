# VF-0 Visual Audit (Phone-First)

Date: 2026-05-26
Phase: `VF-0` (visual audit and token extraction only; no UI implementation changes)

## Scope and Method

- Primary target viewport: `390x844` with `deviceScaleFactor=3` (Telegram phone baseline).
- Functional behavior intentionally unchanged.
- Current screenshots captured from running `frontend_new` at `http://127.0.0.1:4173` with backend-unreachable fallback mode (to keep capture deterministic for all surfaces).
- Draft baseline source: `docs/frontend-redesign-requirements/redesign_ui_drafts/**/{screen.png,code.html}`.

## Side-by-Side Inventory

| Draft Surface | Draft Screenshot | Current Screenshot (390x844 / DPR 3) | Gap Severity |
|---|---|---|---|
| Home + transactions nav | `docs/frontend-redesign-requirements/redesign_ui_drafts/home_screen_with_transactions_nav/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/transactions-home.png` | High |
| Analytics + nav | `docs/frontend-redesign-requirements/redesign_ui_drafts/analytics_with_transactions_nav/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/analytics-home.png` | High |
| Transaction detail popup | `docs/frontend-redesign-requirements/redesign_ui_drafts/transaction_detail_pop_up/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/transaction-edit-dialog.png` | Medium-High |
| Category selector | `docs/frontend-redesign-requirements/redesign_ui_drafts/category_selector_expandable_groups/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/category-selector-dialog.png` | Medium |
| Tag selector | `docs/frontend-redesign-requirements/redesign_ui_drafts/tag_selector_chip_grid_layout/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/tag-selector-dialog.png` | Medium |
| Analytics category drilldown popup | `docs/frontend-redesign-requirements/redesign_ui_drafts/category_transactions_pop_up_with_close_button/screen.png` | `frontend_new/docs/visual-audit/vf-0-current/analytics-category-drilldown-dialog.png` | Medium |

## Shared Draft Visual Tokens (Extracted)

### Core palette

- `primary`: `#137fec`
- `background-light`: `#f6f7f8`
- `background-dark`: `#101922`
- popup dark neutrals: `#1c1c1e`, `#2c2c2e`
- muted scrollbar accent: `#334155`

### Type + iconography

- Primary type family: `Inter`
- Icon system: `Material Symbols Outlined`
- Frequent sizes: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, plus display sizes `text-3xl` to `text-5xl`
- Weights: `font-medium`, `font-semibold`, `font-bold`

### Shape + elevation

- Radii: `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`, sheet top corners `rounded-t-[2.5rem]` / `rounded-t-2xl`
- Shadows: `shadow-sm`, `shadow-lg`, `shadow-2xl`, color shadows like `shadow-primary/20`

### Spacing rhythm (repeated)

- Horizontal shell padding is mostly `px-4`
- Primary section/card spacing: `p-4`, `p-5`, `p-6`
- List item spacing: `p-3` / `p-4`
- Main vertical spacing bands: `gap-2`, `gap-3`, `gap-4`, `gap-6`
- Bottom-nav-safe content offset: `pb-24`

## Repeated Draft Layout Patterns

- Sticky translucent header with bottom border and backdrop blur.
- Fixed bottom nav with 4 icon+label tabs (`Transactions`, `Analytics`, `AI Chat`, `Settings`), active tab uses primary color and stronger weight.
- Card-first vertical composition; cards are dense and grouped by sections.
- Mobile sheet/dialog surfaces are full-width bottom sheets with large top radius and sticky action footer.
- Selector flows (category/tag) are single-purpose surfaces with search at top, scroll body, and explicit sticky `Update` action.
- Drilldown popup prioritizes a centered summary header + compact transaction rows.

## Gap List by Draft Folder

### 1) `home_screen_with_transactions_nav`

- `AppShell` header is currently plain centered text; draft uses wallet icon + tighter title composition and translucent layering.
- Bottom nav is currently text-only pill links; draft uses icon+label tabs and active-state icon fill.
- Transactions page structure differs strongly:
  - draft starts with a balance hero card and compact date/search/filter strip.
  - current page starts with an explicit Filters card and operational controls.
- Transaction rows in current app are functionally rich but visually different (button styles, avatar shapes, chip styling, density).

### 2) `analytics_with_transactions_nav`

- Date controls are currently card + form inputs + preset buttons; draft uses compact chip-style range controls in header area.
- Summary/section cards are structurally similar but differ in typography scale, spacing density, and accent treatment.
- Current nav is text-only; draft nav is icon-first.
- Trend widget treatment (bars/legend hierarchy) differs substantially from draft styling.

### 3) `transaction_detail_pop_up`

- Current edit dialog is bottom-sheet based (correct direction) but header/action layout differs:
  - draft has `Cancel` header affordance and stronger large-amount focal block.
  - current uses standard dialog title/description and form-field-first flow.
- Current CTA stack and destructive action placement are functionally correct but visually less iOS-sheet-like than draft.

### 4) `category_selector_expandable_groups`

- Current grouped selector behavior is aligned, but visual language differs:
  - draft uses icon tiles for groups and lighter list separators.
  - current uses monogram badges and heavier border boxes.
- Header/search block in current version is more utilitarian than draft.

### 5) `tag_selector_chip_grid_layout`

- Current flow behavior matches requirements, but draft style differs:
  - selected tags in draft are fully primary-filled pills in the input region.
  - available chips in draft are denser rectangular chips with icon+label rhythm.
- Current component uses shadcn badges/button variants that look more generic than draft.

### 6) `category_transactions_pop_up_with_close_button`

- Current drilldown dialog exists with explicit close, but draft composition is different:
  - draft uses centered icon/category/amount summary block at top of sheet.
  - current keeps a more conventional dialog header and list layout.
- Row styling and tag/date micro-typography are not yet visually aligned.

## Exact First Implementation Slice for VF-1

Target phase: `VF-1` (app shell + transactions home alignment only)

### Scope

- Align these areas to `home_screen_with_transactions_nav`:
  - app header visual treatment
  - bottom nav icon+label structure
  - transactions page top composition (hero + compact filter entry strip)
  - transaction mobile row/card visual styling
- Preserve all existing behaviors and test IDs required for Phase 1/2 QA.

### Files expected in first slice

- `frontend_new/src/app/layout/AppShell.tsx`
- `frontend_new/src/styles.css`
- `frontend_new/src/pages/TransactionsPage.tsx`
- `frontend_new/src/features/transactions/components/TransactionsMobileList.tsx`
- `frontend_new/src/features/transactions/components/TransactionsFiltersCard.tsx`
- optional style-support touchups in `frontend_new/src/components/ui/{card,button,badge}.tsx` (variant-only, behavior-safe)

### FRs to keep passing while refactoring visuals

- `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-005`
- `FR-006`, `FR-007`, `FR-008`, `FR-009`, `FR-017`, `FR-032`, `FR-034`, `FR-036`, `FR-037`

## Deviations Requiring Approval Before VF-1

1. Token strategy: whether to keep fully dynamic Telegram-derived color mixing as default, or pin shell/transactions visuals closer to fixed draft palette values for fidelity.
2. Icon strategy for nav/header: whether to introduce Material Symbols for exact draft icon rhythm, or stay with existing icon set and approximate shape/weight.
3. Fallback banner presentation during visual reviews: keep visible (current behavior in fallback mode) vs hide/minimize only during visual-capture sessions.

## Artifact Paths

- Current captured screenshots:
  - `frontend_new/docs/visual-audit/vf-0-current/transactions-home.png`
  - `frontend_new/docs/visual-audit/vf-0-current/analytics-home.png`
  - `frontend_new/docs/visual-audit/vf-0-current/transaction-edit-dialog.png`
  - `frontend_new/docs/visual-audit/vf-0-current/category-selector-dialog.png`
  - `frontend_new/docs/visual-audit/vf-0-current/tag-selector-dialog.png`
  - `frontend_new/docs/visual-audit/vf-0-current/analytics-category-drilldown-dialog.png`
