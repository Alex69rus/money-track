# Frontend findings — 2026-07-20

Scope: Transaction category selection in the Telegram Mini App, including transaction edit and quick category update flows.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `sub_cat_icon_bug.jpg` | Category selector | Sub-category icons sit almost directly against their labels. |

## BR-001 — Category choices ignore transaction direction

Priority: P2

Evidence: User-reported transaction edit and quick category selector behavior.

### Actual

The transaction edit category selector and quick category update selector show income and expense categories together. Changing an edit's direction does not update the selectable category set.

### Expected

Each selector shows only categories whose type matches the transaction's current direction. Changing direction in transaction edit updates the selector to the newly selected direction.

### Reproduction

1. Open an expense transaction for editing.
2. Open the category selector, or change the direction to Income and then open it.
3. Observe categories of both directions.

### Acceptance criteria

- The edit selector lists only expense categories for a negative amount and only income categories for a positive amount.
- Switching the edit direction updates the category choices before the selector is opened.
- The quick category update selector filters choices according to its transaction's amount sign.

## BR-002 — Sub-category icon and label lack spacing

Priority: P2

Evidence: `sub_cat_icon_bug.jpg`.

### Actual

Expanded sub-category rows place the icon almost flush against the sub-category name.

### Expected

Each sub-category row has a clear, consistent gap between its icon and its label.

### Reproduction

1. Open the category selector.
2. Expand a category group with sub-categories.
3. Observe the spacing between each child icon and name.

### Acceptance criteria

- Child category icons and labels are visually separated at the mobile target viewport.
- The spacing remains correct for selected and unselected child rows.
