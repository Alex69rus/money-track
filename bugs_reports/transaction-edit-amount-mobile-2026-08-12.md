# Transaction edit findings — 2026-08-12

Scope: Telegram iOS transaction-edit full-page route; amount editing with the iOS decimal keyboard.

This report records observed defects only. The user requested a fix.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `transaction-edit-amount-mobile-2026-08-12.jpg` | Edit Transaction | The amount field's cursor extends well below the displayed amount, and the fixed wide presentation will become cramped for larger values. |

## BR-023 — Transaction amount cursor escapes its field on iOS

Priority: P2

Evidence: `transaction-edit-amount-mobile-2026-08-12.jpg`; user report.

### Actual

On the Telegram iOS Edit Transaction page, the amount input's cursor renders below the visible amount text and into the surrounding content. The fixed-width, oversized amount field is also awkward to edit for amounts such as `1500.00 AED` and larger.

### Expected

The cursor remains visually aligned with and contained by the editable amount. Large amounts remain readable and easy to edit on a phone without overlapping the currency symbol or clipping.

### Reproduction

1. Open a transaction in Telegram iOS and enter the full-page edit route.
2. Focus the amount field so the decimal keyboard opens.
3. Observe the cursor beside a value such as `-158.5`, then edit an amount at least as wide as `-1500.00`.

### Acceptance criteria

- On an iPhone-sized viewport, the focused amount input has an explicit, text-matched height and line height so its cursor is contained and aligned with its digits.
- A value of `-1500.00` and longer valid values remain fully legible and editable without collision with the currency symbol.
- The decimal iOS keyboard, comma normalization, sign controls, and two-decimal blur formatting continue to work.
- Browser coverage protects the stable input sizing and mobile layout contract; Telegram iPhone smoke verification is recorded or its absence is explicitly noted.
