# Transactions, editor, and Analytics follow-up findings — 2026-07-15

## Scope

Focused browser and iPhone feedback for the expanded Transactions filters, transaction list separators, transaction deletion confirmation, Analytics Monthly Trends, and amount editing.

## Evidence

| Evidence | Covers |
| --- | --- |
| `temp.md` (repository root; user feedback) | BR-013 through BR-018 |
| `ios_keyboard_transaction_edit.jpeg` | BR-017 and BR-018: iPhone decimal keypad exposes `,` rather than `.` and has no minus key |

## Findings

### BR-013 — Transactions category and tag filtering is difficult to understand

**Priority:** P2  
**Observed:** The expanded filter card presents a separate category search field and selector, while tags are split between suggested and selected chips plus another selector action. The selection paths are visually and behaviorally inconsistent.  
**Expected:** Category and tag filters should each have one clear, dedicated selection surface with search, clear selection state, and an unambiguous return to the filters.

### BR-014 — Same-day transaction dividers are too bright in dark theme

**Priority:** P2  
**Observed:** Dividers between Transactions in the same date group render near-white on the black theme and compete with the card content.  
**Expected:** Dividers should use a subdued dark-theme border color consistent with the rest of the Transactions and Analytics cards.

### BR-015 — Delete confirmation does not match the transaction editor

**Priority:** P2  
**Observed:** The generic delete popup does not share the editor's dark surface, rounded geometry, or destructive-action hierarchy.  
**Expected:** The confirmation should feel like a coherent extension of the dark editor while keeping Cancel and irreversible Delete distinct and reachable.

### BR-016 — Monthly Trends order must be chronological

**Priority:** P2  
**Observed:** The chart can present a later month to the left of an earlier month (for example, June after May), which makes the trend hard to read.  
**Expected:** Monthly Trend items always progress from the earliest displayed month on the left to the latest on the right.

### BR-017 — iPhone decimal keypad cannot reliably enter a fractional amount

**Priority:** P1  
**Observed:** The iPhone numeric keypad offers a comma, not a dot. The editor only accepts the dot-based numeric value, so a value such as `12.32` cannot be entered reliably.  
**Expected:** The editor accepts the locale decimal key while typing and normalizes it to the stored decimal format without changing the intended value.

### BR-018 — iPhone numeric keypad cannot make an amount negative

**Priority:** P1  
**Observed:** The iPhone numeric keypad contains no minus key, so a user cannot turn a typed amount into an expense.  
**Expected:** The amount editor exposes a reachable sign control that can mark the entered value as income or expense without requiring a keyboard minus key.

## Acceptance summary

- Filter category and tags through single-purpose selector pages rather than competing compact controls.
- Use subdued same-day separators and an editor-consistent delete confirmation.
- Sort monthly data deterministically by year and month before rendering.
- Accept both decimal-key conventions during entry and provide visible income/expense sign selection.
