# PRD: Transaction refunds

## Decision

Refunds are small log entries inside an existing transaction. They are not separate transactions and do not have their own date, currency, category, analytics treatment, or list item.

When a refund is added, the edited transaction amount is reduced toward zero. Removing a refund restores that amount. Existing analytics and every other calculation continue to use the resulting transaction amount.

## Scope

- Add a `refunds` JSON field to transactions, defaulting to `[]`.
- Each entry has `id` (integer, unique within its transaction), a positive amount with at most two decimal places, and an optional `note` (empty when omitted, maximum 500 characters).
- Return and accept `refunds` through the existing transaction read/update contract. No new routes are needed.
- Support refunds only from the existing full-page Edit Transaction view.

## Edit experience

- Place a compact **Refunds** section directly below the main amount field.
- Show the section for expense transactions. To change a transaction with refunds back to Income, the user first removes its refunds.
- When there are no refunds, show only the section title and a small **+ Add** button. Do not show table headers.
- **+ Add** opens the two compact inputs: amount and note. The amount deliberately has no currency label; the transaction already establishes it.
- Confirming **Add refund** appends a row, immediately updates the draft transaction amount, and shows the table: **Amount**, **Note**, and a remove cross. New draft entries use `max(existing id) + 1`.
- The existing **Save Changes** and **Delete Transaction** actions remain unchanged.
- Tapping the remove cross removes that draft refund and immediately restores its amount. A normal Save persists all changes together.

## Amount rules

- A refund amount must be greater than zero and no larger than the transaction's current absolute amount before that refund is added.
- An invalid entered amount keeps the transaction amount and refund log unchanged, displays **“Refunds cannot exceed the transaction amount”**, and prevents Save while the invalid add state is open.
- A full refund may reduce the transaction to `0`. The original direction remains selected, the table stays visible, and **+ Add** is disabled.
- There is no stored “original amount” and no lifetime refund cap. If a user later edits the current amount, that new current amount becomes the limit for the next refund. For example: 100 → refund 20 → 80 → edit to 130 → a further refund of 130 is valid.
- V1 applies refunds to expense transactions only. Applying a refund moves the stored signed amount toward zero. Currency and category always remain those of the parent transaction. A zero amount with refunds is therefore still presented as an expense after reopening, without adding another persisted field.

## Data integrity

- The backend validates that every refund has a unique integer id, a positive amount with at most two decimal places, and an optional note within the existing 500-character limit. A transaction with refunds must have a non-positive amount.
- A rejected update must leave the stored transaction amount and refund log unchanged.
- Refunds are user-scoped through the existing transaction update ownership check.
- The client performs the live “cannot exceed current amount” check and calculates the submitted amount. This is intentional: a manual amount edit is allowed to redefine the next refund limit, so the backend cannot infer a single original amount or reconcile both changes without adding product rules that this feature explicitly avoids. The backend validates the final submitted shape before atomically saving it.

## Out of scope

- Separate refund transactions, transaction types, links between transactions, refund dates, or refund-specific filters and analytics.
- Bot/SMS refund detection and standalone refund creation.
- Storing the original amount, or adding a refund currency/category selector.
- Changing analytics queries or calculations.

## Acceptance criteria

1. A transaction with no refunds has an empty `refunds` array and the edit screen shows no refund table headers.
2. Adding one or more valid refunds updates the draft amount toward zero and persists the ordered log on Save.
3. Removing any refund restores exactly its amount and persists the remaining log on Save.
4. A user cannot add a refund larger than the current transaction amount; neither the saved transaction nor its refund log is changed by that failed attempt.
5. A fully refunded transaction saves at zero without changing its direction, category, or currency.
6. Changing the transaction amount after a refund changes the allowance for the next refund; no original-amount field or cap is introduced.
7. Existing transaction listing and analytics continue to use the stored transaction amount without refund-specific logic.

## Verification

- Backend integration tests cover default/read/update persistence, full refund to zero, malformed refund data rejection, user scoping, and proof that rejected updates do not alter the stored transaction.
- Frontend tests cover the empty section, add/remove amount restoration, multiple refunds, full refund, an over-limit attempt, and editing the amount before a later refund.
