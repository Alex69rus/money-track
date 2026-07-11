# Telegram iOS smoke-test findings — 2026-07-11

Scope: `frontend_new` running inside the Telegram iOS Mini App.

This report records observed defects only. No behavior or layout fix is included in this iteration.

## Evidence to add to this folder

| Screenshot | Surface | Highlights |
| --- | --- | --- |
| `IMG_7773.jpeg` | Analytics top | visible preset scrollbar; collapsed Balance Snapshot card |
| `IMG_7771.jpeg` | Analytics middle/bottom | inert `View all` actions; collapsed Monthly Trends card |
| `IMG_7772.jpeg` | Transactions list | negative amount sign separated from the amount |
| `IMG_7774.jpg` | Transactions filters | unbounded rendering of the tag catalogue |

## BR-001 — Date-preset scrollbar is visible in Analytics

Priority: P2

Evidence: `IMG_7773.jpeg`, red outline below the date preset pills.

### Actual

The horizontally scrollable date presets render a native grey scrollbar/track. It competes visually with the pills and makes the control look broken.

### Expected

The preset row may remain horizontally swipeable when it cannot fit, but its scrollbar must be visually hidden. The active preset must remain clear, and no content should be clipped by the card edge.

### Acceptance criteria

- No visible horizontal scrollbar or track on iOS/Telegram.
- Swiping horizontally still reaches every preset.
- The control does not create page-level horizontal overflow.

## BR-002 — Analytics widgets collapse to header-only height

Priority: P1

Evidence: `IMG_7773.jpeg` (`Balance Snapshot`) and `IMG_7771.jpeg` (`Monthly Trends`).

### Actual

Both widgets render as very short cards: their heading is visible but their intended chart/summary content is absent or clipped. `Monthly Trends` is especially visible as a thin, nearly empty card above the bottom navigation.

### Expected

Each analytics widget must reserve enough height for its meaningful content, loading state, empty state, or error state. A card must never silently collapse to a title-only strip unless that is an intentional, explicitly designed compact state.

### Acceptance criteria

- `Balance Snapshot` shows its body or a deliberate loading/empty/error state.
- `Monthly Trends` shows its trend content or a deliberate loading/empty/error state.
- The bottom navigation does not cover either widget.
- The analytics page remains vertically scrollable; no widget relies on accidental clipping to fit.

## BR-003 — Analytics `View all` actions are inert

Priority: P1

Evidence: `IMG_7771.jpeg`, both highlighted `View all` buttons.

### Actual

`View all` is displayed in both `Spendings by Category` and `Spendings by Tags`, but tapping it produces no visible action.

### Expected

Each action must open a complete, usable representation of the corresponding data for the active date range. The implementation may use a sheet, dialog, or route, but it must include an explicit return/close action.

### Acceptance criteria

- Category `View all` opens the full category breakdown.
- Tag `View all` opens the full tag breakdown.
- The selected date range and analytics context are retained.
- The opened surface is scrollable, has a visible close/back action, and works in the Telegram phone viewport.

## BR-004 — Transaction amount sign breaks onto a separate line

Priority: P1

Evidence: `IMG_7772.jpeg`, highlighted amount column.

### Actual

The negative sign appears on its own line above `AED 1.23`. This makes the financial value harder to scan and can misrepresent the sign at a glance.

### Expected

The sign, amount, and currency are one indivisible visual value on a single line. The layout must preserve this for realistic large values, including values such as `-12,000 AED` / `-AED 12,000.00` in the product's chosen display format.

### Acceptance criteria

- No line break between sign, digits, decimal portion, and currency.
- No clipping or ellipsis for the signed amount.
- The transaction note/title yields or truncates before the amount column does.
- Validate with small, large, positive, and negative amounts on the target phone width.

## BR-005 — Transactions filter renders the entire tag catalogue inline

Priority: P1

Evidence: `IMG_7774.jpg`, highlighted tag filter area.

### Actual

The tag filter immediately renders every tag as a chip, including long system/test tags. With a real catalogue this turns the filter panel into a huge, noisy list and pushes useful transaction content far down the page.

### Expected

The collapsed transactions filter must show only a small, intentional subset of tag choices and the current selection. The full catalogue must remain discoverable through search and/or an explicit `Show all tags` selector surface.

### Acceptance criteria

- The initial filter panel renders a bounded number of tag chips; it must not render all available tags.
- Long tag labels truncate safely and never force horizontal overflow.
- Search and an explicit expand/selector action expose all tags when needed.
- Selected tags remain visible and removable after the collapsed subset is applied.
- The filter remains practical with hundreds or thousands of tags.

## Suggested next-iteration order

1. BR-002: Analytics widget sizing/clipping.
2. BR-004: signed amount layout integrity.
3. BR-005: bounded tag-filter presentation.
4. BR-003: functional `View all` destinations.
5. BR-001: hide the preset scrollbar while preserving swipe behavior.
