# Transactions and Analytics findings — 2026-07-14

Scope: Telegram iPhone client; Transactions list and Analytics monthly trends widget.

This report records observed defects only.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `IMG_7791.jpeg` | Transactions | Rows with visible selected category names still render the `?` category glyph. |
| `IMG_7790.jpeg` | Analytics | The selected-month summary places the month/year on the right and does not show the selected month’s calculated net amount. |

## BR-009 — Selected categories render as uncategorized on mobile transaction cards

Priority: P2

Evidence: `IMG_7791.jpeg`; user report.

### Actual

Mobile transaction cards render a `?` category glyph when the selected category has no configured icon, even though the category name is shown in the transaction metadata.

### Expected

The `?` glyph is reserved for transactions without a selected category. A selected category without its own icon shows up to two meaningful initials from its category name instead.

### Reproduction

1. Open Transactions on a phone.
2. View a transaction whose category is selected but has no configured icon.
3. Observe the `?` glyph beside its category name.

### Acceptance criteria

- A transaction with `categoryId: null` retains the explicit `?` affordance.
- A transaction with a selected category never renders `?`; it renders its configured icon or up to two initials derived from its category name.
- Category and tag actions, card editing, and signed amount layout remain unchanged.

## BR-010 — Monthly Trends omits selected-month net and reverses summary priority

Priority: P2

Evidence: `IMG_7790.jpeg`; user report.

### Actual

The selected-month summary labels the left side “Selected month,” places the actual month/year on the right, and omits the calculated net amount.

### Expected

The selected month’s name and year appear on the left, and its signed net amount appears on the right. Income and expense values remain available below.

### Reproduction

1. Open Analytics on a phone with monthly trend data.
2. Select a month in Monthly Trends.
3. Inspect the selected-month summary.

### Acceptance criteria

- The summary header places the selected month name and year on the left.
- The summary header places the selected month’s signed `income - expense` value on the right.
- Selecting a different month updates the month, net, income, and expense values together.
