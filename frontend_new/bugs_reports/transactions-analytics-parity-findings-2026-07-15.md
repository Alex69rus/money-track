# Transactions and Analytics parity findings — 2026-07-15

Scope: Telegram iPhone feedback for the shipped `frontend_new` Transactions, Analytics drilldown, and transaction-edit flows.

This report records observed defects only. The requested fixes are tracked in `docs/tasklist.md`.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `IMG_7792.jpg` | Transaction edit | A whole-number amount is rendered as `-13`, and the Tags card shows a redundant plus control. |
| `IMG_7793.jpeg` | Transactions | The balance snapshot and the `RECENT TRANSACTIONS` / record-count header are visible. |
| `Screenshot 2026-07-15 at 21.42.57.png` | Transaction edit | Confirms the redundant Tags plus control on another transaction. |

## BR-009 — Analytics drilldown category fallback is inconsistent

Priority: P2

Evidence: User report; affected category, tag, and View all analytics drilldowns.

### Actual

Transactions whose category has no configured icon use the corrected fallback on Transactions, but Analytics drilldown rows can still render the missing category-icon treatment.

### Expected

Category, tag, and View all drilldowns must use the same readable category fallback as Transactions when a category icon is absent.

### Reproduction

1. Open Analytics and enter a category, tag, or View all drilldown containing a transaction whose category has no icon.
2. Inspect the transaction row.
3. The row does not match the Transactions page's category fallback.

### Acceptance criteria

- Category, tag, and View all drilldown rows display the shared fallback when the category icon is blank or missing.
- A configured category icon continues to render unchanged.

## BR-010 — Transaction editor does not retain two decimal places and duplicates tag entry

Priority: P2

Evidence: `IMG_7792.jpg`, `Screenshot 2026-07-15 at 21.42.57.png`.

### Actual

Whole-number transaction amounts render as `-13` in the editor. The Tags card also exposes a plus control even though tapping the no-tags state or card already opens tag selection.

### Expected

Whole-number amounts render with two fractional digits, such as `-13.00`, and the redundant Tags plus control is absent while the card remains selectable.

### Reproduction

1. Open the transaction editor for an expense with amount `-13` and no tags.
2. Inspect the amount and Tags card.
3. The amount lacks `.00` and the duplicate plus control is visible.

### Acceptance criteria

- The initial editor value uses exactly two decimal places for whole-number amounts.
- Existing fractional precision is not rounded during editing or saving.
- Tapping either the Tags card or the no-tags state opens tag selection without a plus control.

## BR-011 — Transactions page exposes retired header and total count

Priority: P3

Evidence: `IMG_7793.jpeg`.

### Actual

The Transactions page shows the `RECENT TRANSACTIONS` label and a total-record count badge.

### Expected

Neither the label nor the total-record count is shown on the Transactions page.

### Reproduction

1. Open Transactions with one or more results.
2. Inspect the list header.
3. The label and count badge are visible.

### Acceptance criteria

- Transactions results render without the `RECENT TRANSACTIONS` label or total-count badge.
- Date-group totals and list pagination behavior remain intact.

## BR-012 — Current-month balance snapshots disagree between Transactions and Analytics

Priority: P1

Evidence: `IMG_7793.jpeg`; user comparison against Analytics with the current-month range selected.

### Actual

The Transactions balance snapshot values do not match Analytics for the same current-month period.

### Expected

Both surfaces calculate income, expenses, and balance from the identical current-month boundary and signed-amount rules.

### Reproduction

1. Open Transactions and record its balance snapshot.
2. Open Analytics with the current-month preset.
3. Compare income, expenses, and balance.
4. At least one value differs.

### Acceptance criteria

- Transactions and Analytics show matching values for a current-month dataset.
- Month boundary and signed income/expense semantics are covered by regression tests.
